import { describe, expect, test } from "bun:test";

import { Peer, type PeerSocket, RequestTimeoutError } from "../src/index";

/** Two in-memory sockets wired to each other. */
class FakeSocket implements PeerSocket {
  peer!: FakeSocket;
  private msgCb?: (d: string) => void;
  private closeCb?: () => void;
  closed = false;

  send(data: string): void {
    if (this.closed || this.peer.closed) return;
    queueMicrotask(() => this.peer.msgCb?.(data));
  }
  close(): void {
    if (this.closed) return;
    this.closed = true;
    queueMicrotask(() => {
      this.closeCb?.();
      this.peer.close();
    });
  }
  onMessage(cb: (d: string) => void): void {
    this.msgCb = cb;
  }
  onClose(cb: () => void): void {
    this.closeCb = cb;
  }
}

function pair(): [FakeSocket, FakeSocket] {
  const a = new FakeSocket();
  const b = new FakeSocket();
  a.peer = b;
  b.peer = a;
  return [a, b];
}

describe("Peer request/response", () => {
  test("request resolves with the responder's return value", async () => {
    const [sa, sb] = pair();
    const a = new Peer(sa);
    new Peer(sb, {
      onRequest: (type, payload) => ({ echoed: type, payload }),
    });
    const res = await a.request("browser_click", { ref: "e1" });
    expect(res).toEqual({ echoed: "browser_click", payload: { ref: "e1" } });
  });

  test("a thrown handler rejects the requester with the message", async () => {
    const [sa, sb] = pair();
    const a = new Peer(sa);
    new Peer(sb, {
      onRequest: () => {
        throw new Error("tab 5 not found");
      },
    });
    await expect(a.request("browser_click", {})).rejects.toThrow(
      "tab 5 not found",
    );
  });

  test("concurrent requests are correlated independently", async () => {
    const [sa, sb] = pair();
    const a = new Peer(sa);
    new Peer(sb, {
      onRequest: async (_t, p) => {
        const { n } = p as { n: number };
        await new Promise((r) => setTimeout(r, n % 2 ? 20 : 5));
        return n * 10;
      },
    });
    const results = await Promise.all([
      a.request<number>("x", { n: 1 }),
      a.request<number>("x", { n: 2 }),
      a.request<number>("x", { n: 3 }),
    ]);
    expect(results).toEqual([10, 20, 30]);
  });
});

describe("Peer notify + ping", () => {
  test("notify delivers without a response", async () => {
    const [sa, sb] = pair();
    const a = new Peer(sa);
    let got: unknown;
    new Peer(sb, { onNotify: (_t, p) => void (got = p) });
    a.notify("tabs_changed", { tabs: [1, 2] });
    await new Promise((r) => setTimeout(r, 5));
    expect(got).toEqual({ tabs: [1, 2] });
  });

  test("ping resolves against the auto pong", async () => {
    const [sa, sb] = pair();
    const a = new Peer(sa);
    new Peer(sb);
    await expect(a.ping(200)).resolves.toBeUndefined();
  });
});

describe("Peer timeouts + disconnect", () => {
  test("request rejects with RequestTimeoutError when no reply arrives", async () => {
    const [sa, sb] = pair();
    const a = new Peer(sa);
    // Partner never responds (no Peer, just a live socket).
    sb.onMessage(() => {});
    await expect(a.request("x", {}, { timeoutMs: 40 })).rejects.toBeInstanceOf(
      RequestTimeoutError,
    );
  });

  test("closing rejects all in-flight requests", async () => {
    const [sa, sb] = pair();
    const a = new Peer(sa);
    new Peer(sb, { onRequest: () => new Promise(() => {}) }); // never resolves
    const pending = a.request("x", {}, { timeoutMs: 5000 });
    a.close();
    await expect(pending).rejects.toThrow(/disconnect/i);
  });

  test("malformed frames are ignored, peer keeps working", async () => {
    const [sa, sb] = pair();
    const a = new Peer(sa);
    new Peer(sb, { onRequest: () => "ok" });
    // shove garbage straight at A's message handler path
    sb.send("not json{{{");
    await new Promise((r) => setTimeout(r, 5));
    await expect(a.request("x", {})).resolves.toBe("ok");
  });
});
