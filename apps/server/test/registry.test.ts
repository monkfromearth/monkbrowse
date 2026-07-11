import { beforeEach, describe, expect, test } from "bun:test";

import { type Peer, RequestTimeoutError } from "@monkbrowse/messaging";
import type { Hello } from "@monkbrowse/protocol";

import { ConnectionRegistry } from "../src/registry";

const PORTS = [9222, 9223, 9224];

function hello(profileId: string, label: string, tabs: Hello["tabs"] = []): Hello {
  return { profileId, label, extVersion: "0.2.0", tabs };
}

/** Minimal fake Peer whose request() is driven by `handler`. */
function fakePeer(
  handler: (type: string, payload: unknown) => Promise<unknown> = async () => ({}),
): Peer & { closed: boolean } {
  const p = {
    closed: false,
    request: (t: string, pl: unknown) => handler(t, pl),
    notify: () => {},
    ping: async () => {},
    rejectAllPending: () => {},
    close() {
      p.closed = true;
    },
  };
  return p as unknown as Peer & { closed: boolean };
}

describe("ConnectionRegistry — handshake", () => {
  let reg: ConnectionRegistry;
  beforeEach(() => {
    reg = new ConnectionRegistry(PORTS, "test");
  });

  test("adopts a fresh profile", () => {
    const ack = reg.handleHello(9222, fakePeer(), hello("uuid-a", "Work"));
    expect(ack.ok).toBe(true);
    const conn = reg.get(9222)!;
    expect(conn.status).toBe("connected");
    expect(conn.profileId).toBe("uuid-a");
    expect(conn.label).toBe("Work");
  });

  test("same profileId reconnecting reuses the slot and closes the stale peer", () => {
    const first = fakePeer();
    reg.handleHello(9222, first, hello("uuid-a", "Work", [
      { tabId: 1, url: "u", title: "t", active: true, windowId: 1 },
    ]));
    const second = fakePeer();
    const ack = reg.handleHello(9222, second, hello("uuid-a", "Work"));
    expect(ack.ok).toBe(true);
    expect((first as unknown as { closed: boolean }).closed).toBe(true);
    expect(reg.get(9222)!.peer).toBe(second);
  });

  test("a different profile on a live port is REJECTED, incumbent kept", () => {
    const incumbent = fakePeer();
    reg.handleHello(9222, incumbent, hello("uuid-a", "Work"));
    const ack = reg.handleHello(9222, fakePeer(), hello("uuid-b", "Other"));
    expect(ack.ok).toBe(false);
    expect(ack.reason).toMatch(/different port/i);
    // incumbent untouched
    expect(reg.get(9222)!.profileId).toBe("uuid-a");
    expect((incumbent as unknown as { closed: boolean }).closed).toBe(false);
  });

  test("two different profiles coexist on different ports (no eviction)", () => {
    expect(reg.handleHello(9222, fakePeer(), hello("uuid-a", "Work")).ok).toBe(
      true,
    );
    expect(
      reg.handleHello(9223, fakePeer(), hello("uuid-b", "Home")).ok,
    ).toBe(true);
    expect(reg.listConnected().map((c) => c.port).sort()).toEqual([9222, 9223]);
  });
});

describe("ConnectionRegistry — disconnect", () => {
  test("disconnect keeps the record but drops the peer", () => {
    const reg = new ConnectionRegistry(PORTS, "test");
    const peer = fakePeer();
    reg.handleHello(9222, peer, hello("uuid-a", "Work", [
      { tabId: 1, url: "u", title: "t", active: true, windowId: 1 },
    ]));
    reg.handleDisconnect(9222, peer);
    const conn = reg.get(9222)!;
    expect(conn.status).toBe("disconnected");
    expect(conn.peer).toBeNull();
    expect(conn.label).toBe("Work"); // preserved
    expect(conn.tabs.size).toBe(1); // preserved
  });

  test("a stale peer's disconnect is ignored", () => {
    const reg = new ConnectionRegistry(PORTS, "test");
    const first = fakePeer();
    reg.handleHello(9222, first, hello("uuid-a", "Work"));
    const second = fakePeer();
    reg.handleHello(9222, second, hello("uuid-a", "Work")); // reconnect
    reg.handleDisconnect(9222, first); // stale
    expect(reg.get(9222)!.status).toBe("connected");
    expect(reg.get(9222)!.peer).toBe(second);
  });
});

describe("ConnectionRegistry — resolveProfile", () => {
  let reg: ConnectionRegistry;
  beforeEach(() => {
    reg = new ConnectionRegistry(PORTS, "test");
    reg.handleHello(9222, fakePeer(), hello("uuid-a", "Work"));
    reg.handleHello(9223, fakePeer(), hello("uuid-b", "Home"));
  });

  test("by port number", () => {
    expect(reg.resolveProfile(9223).profileId).toBe("uuid-b");
  });
  test("by profileId string", () => {
    expect(reg.resolveProfile("uuid-a").port).toBe(9222);
  });
  test("by numeric string port", () => {
    expect(reg.resolveProfile("9223").port).toBe(9223);
  });
  test("focused = most recently used when several are connected", () => {
    reg.markUsed(9223);
    expect(reg.resolveProfile().port).toBe(9223);
  });
  test("unknown selector throws with candidates", () => {
    expect(() => reg.resolveProfile(9999)).toThrow(/No profile matches/);
  });
  test("a disconnected explicit target throws an actionable message", () => {
    const p = reg.get(9222)!.peer as Peer;
    reg.handleDisconnect(9222, p);
    expect(() => reg.resolveProfile(9222)).toThrow(/not connected/i);
  });
  test("no profiles connected throws", () => {
    const empty = new ConnectionRegistry(PORTS, "test");
    expect(() => empty.resolveProfile()).toThrow(/No browser profile/);
  });
});

describe("ConnectionRegistry — send", () => {
  const okSnapshot = {
    tabId: 1,
    url: "https://x.com",
    title: "X",
    snapshot: "- link [ref=e1]",
  };

  test("validates and returns the response", async () => {
    const reg = new ConnectionRegistry(PORTS, "test");
    reg.handleHello(9222, fakePeer(async () => okSnapshot), hello("a", "Work"));
    const res = await reg.send(reg.get(9222)!, "browser_snapshot", {});
    expect(res).toMatchObject({ tabId: 1, title: "X" });
  });

  test("retries an idempotent read once on timeout", async () => {
    let calls = 0;
    const reg = new ConnectionRegistry(PORTS, "test");
    reg.handleHello(
      9222,
      fakePeer(async () => {
        calls++;
        if (calls === 1) throw new RequestTimeoutError("browser_snapshot", 10);
        return okSnapshot;
      }),
      hello("a", "Work"),
    );
    const res = await reg.send(reg.get(9222)!, "browser_snapshot", {});
    expect(calls).toBe(2);
    expect(res).toMatchObject({ tabId: 1 });
  });

  test("does NOT retry a mutating action on timeout", async () => {
    let calls = 0;
    const reg = new ConnectionRegistry(PORTS, "test");
    reg.handleHello(
      9222,
      fakePeer(async () => {
        calls++;
        throw new RequestTimeoutError("browser_click", 10);
      }),
      hello("a", "Work"),
    );
    await expect(
      reg.send(reg.get(9222)!, "browser_click", { ref: "e1", element: "x" }),
    ).rejects.toBeInstanceOf(RequestTimeoutError);
    expect(calls).toBe(1);
  });

  test("sending to a disconnected profile throws", async () => {
    const reg = new ConnectionRegistry(PORTS, "test");
    const conn = reg.get(9224)!; // never connected
    await expect(reg.send(conn, "getUrl", {})).rejects.toThrow(/not connected/i);
  });
});
