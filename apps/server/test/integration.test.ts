import { afterEach, describe, expect, test } from "bun:test";
import { WebSocket, type WebSocketServer } from "ws";

import { Peer } from "@monkbrowse/messaging";
import type { Hello, HelloAck } from "@monkbrowse/protocol";

import { TargetQueueManager } from "../src/queue";
import { ConnectionRegistry } from "../src/registry";
import { type ToolContext, toolHandlers } from "../src/tools";
import { wsToPeerSocket } from "../src/ws-adapter";
import { startListeners } from "../src/ws-server";

let uniqueBase = 19230;
function nextBase(): number {
  const b = uniqueBase;
  uniqueBase += 10;
  return b;
}

interface Server {
  ctx: ToolContext;
  servers: WebSocketServer[];
  close: () => void;
}

async function startServer(ports: number[]): Promise<Server> {
  const registry = new ConnectionRegistry(ports, "test");
  const queue = new TargetQueueManager();
  const servers = await startListeners(registry, ports, "127.0.0.1");
  return {
    ctx: { registry, queue },
    servers,
    close: () => {
      registry.closeAll();
      for (const s of servers) s.close();
    },
  };
}

interface FakeProfile {
  peer: Peer;
  seen: string[];
}

/** Connect a simulated extension: WebSocket + Peer that answers wire requests. */
function connectProfile(
  port: number,
  profileId: string,
  label: string,
): Promise<FakeProfile & { ack: HelloAck }> {
  const tabs = [
    { tabId: 1, url: `https://${label}.example`, title: label, active: true, windowId: 1 },
    { tabId: 2, url: "https://other.example", title: "Other", active: false, windowId: 1 },
  ];
  const seen: string[] = [];
  const exec = (type: string, payload: Record<string, unknown>) => {
    seen.push(type);
    const tabId = (payload.tabId as number | undefined) ?? 1;
    switch (type) {
      case "list_tabs":
        return { tabs };
      case "browser_snapshot":
        return { tabId, url: `https://${label}.example`, title: label, snapshot: `- link "${label}" [ref=e1]` };
      case "getUrl":
        return { tabId, url: `https://${label}.example` };
      case "getTitle":
        return { tabId, title: label };
      case "browser_screenshot":
        return { tabId, data: "AAAA" };
      case "browser_get_console_logs":
        return { tabId, logs: [] };
      case "browser_switch_tab":
        return { activeTabId: tabId };
      default:
        return { tabId };
    }
  };
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    ws.on("error", reject);
    ws.on("open", async () => {
      const peer = new Peer(wsToPeerSocket(ws), {
        onRequest: (type, payload) => exec(type, (payload as Record<string, unknown>) ?? {}),
      });
      const hello: Hello = { profileId, label, extVersion: "0.2.0", tabs };
      const ack = (await peer.request("hello", hello, { timeoutMs: 3000 })) as HelloAck;
      resolve({ peer, seen, ack });
    });
  });
}

function textOf(result: { content: { text?: string }[] }): string {
  return result.content.map((c) => c.text ?? "").join("\n");
}

let current: Server | null = null;
afterEach(() => {
  current?.close();
  current = null;
});

describe("server integration (real WS + Peer + tools)", () => {
  test("handshake + list_tabs for one profile", async () => {
    const base = nextBase();
    current = await startServer([base]);
    const { ack } = await connectProfile(base, "uuid-a", "Work");
    expect(ack.ok).toBe(true);

    const r = await toolHandlers.browser_list_tabs!(current.ctx, {});
    const text = textOf(r);
    expect(text).toContain("Work");
    expect(text).toContain(`${base}:1`);
  });

  test("two profiles coexist — no eviction — and list_tabs aggregates both", async () => {
    const base = nextBase();
    current = await startServer([base, base + 1]);
    const a = await connectProfile(base, "uuid-a", "Work");
    const b = await connectProfile(base + 1, "uuid-b", "Home");
    expect(a.ack.ok).toBe(true);
    expect(b.ack.ok).toBe(true);

    const text = textOf(await toolHandlers.browser_list_tabs!(current.ctx, {}));
    expect(text).toContain("Work");
    expect(text).toContain("Home");
    expect(text).toContain(`${base}:1`);
    expect(text).toContain(`${base + 1}:1`);
  });

  test("addressing routes to the named profile", async () => {
    const base = nextBase();
    current = await startServer([base, base + 1]);
    const a = await connectProfile(base, "uuid-a", "Work");
    const b = await connectProfile(base + 1, "uuid-b", "Home");

    const r = await toolHandlers.browser_navigate!(current.ctx, {
      profile: base + 1,
      url: "https://home.example",
    });
    // snapshot title comes from the fake it was routed to
    expect(textOf(r)).toContain("Home");
    expect(b.seen).toContain("browser_navigate");
    expect(a.seen).not.toContain("browser_navigate");
  });

  test("same-port conflict rejects the newcomer, keeps the incumbent", async () => {
    const base = nextBase();
    current = await startServer([base]);
    const a = await connectProfile(base, "uuid-a", "Work");
    expect(a.ack.ok).toBe(true);
    const b = await connectProfile(base, "uuid-b", "Intruder");
    expect(b.ack.ok).toBe(false);
    expect(b.ack.reason).toMatch(/different port/i);
    // incumbent still serves
    const text = textOf(await toolHandlers.browser_list_tabs!(current.ctx, {}));
    expect(text).toContain("Work");
    expect(text).not.toContain("Intruder");
  });

  test("concurrent calls to two profiles both succeed", async () => {
    const base = nextBase();
    current = await startServer([base, base + 1]);
    await connectProfile(base, "uuid-a", "Work");
    await connectProfile(base + 1, "uuid-b", "Home");
    const [ra, rb] = await Promise.all([
      toolHandlers.browser_snapshot!(current.ctx, { profile: base }),
      toolHandlers.browser_snapshot!(current.ctx, { profile: base + 1 }),
    ]);
    expect(textOf(ra)).toContain("Work");
    expect(textOf(rb)).toContain("Home");
  });

  test("reconnect with the same profileId reuses the slot", async () => {
    const base = nextBase();
    current = await startServer([base]);
    const first = await connectProfile(base, "uuid-a", "Work");
    first.peer.close();
    await new Promise((r) => setTimeout(r, 50));
    const again = await connectProfile(base, "uuid-a", "Work");
    expect(again.ack.ok).toBe(true);
    const text = textOf(await toolHandlers.browser_list_tabs!(current.ctx, {}));
    expect(text).toContain("Work");
  });
});
