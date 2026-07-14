import { mcpConfig } from "@monkbrowse/config/mcp.config";
import { Peer, type PeerSocket } from "@monkbrowse/messaging";
import { type Hello, HelloAckSchema } from "@monkbrowse/protocol";
import { backoffDelay } from "@monkbrowse/utils";

import { KIND, TO } from "../../lib/constants";

/**
 * Owns the single WebSocket to this profile's server port. Lives in an offscreen
 * document so the socket survives service-worker suspension. All Chrome API work
 * is delegated back to the service worker via runtime messages.
 */

let peer: Peer | null = null;
let ws: WebSocket | null = null;
let attempt = 0;
let closedByUs = false;

async function bgSend(kind: string, extra: Record<string, unknown> = {}) {
  const res = (await chrome.runtime.sendMessage({ to: TO.bg, kind, ...extra })) as
    | { ok: true; result: unknown }
    | { ok: false; error: string }
    | undefined;
  if (!res?.ok) {
    throw new Error(res?.error ?? "service worker error");
  }
  return res.result;
}

function reportStatus(connected: boolean): void {
  // Fire-and-forget. If the service worker is momentarily asleep/restarting the
  // send rejects with "Receiving end does not exist" — harmless; swallow it.
  chrome.runtime
    .sendMessage({ to: TO.bg, kind: KIND.socketStatus, connected })
    .catch(() => {});
}

function browserSocket(socket: WebSocket): PeerSocket {
  return {
    send: (d) => socket.send(d),
    close: () => socket.close(),
    onMessage: (cb) =>
      socket.addEventListener("message", (e) => {
        if (typeof e.data === "string") cb(e.data);
      }),
    onClose: (cb) => socket.addEventListener("close", () => cb()),
  };
}

function closeCurrent(): void {
  closedByUs = true;
  try {
    ws?.close();
  } catch {
    // already closed
  }
}

function scheduleReconnect(): void {
  const delay = backoffDelay(attempt++, 1_000, 30_000);
  setTimeout(() => void connect(), delay);
}

async function connect(): Promise<void> {
  closedByUs = false;
  let info: { hello: Hello; assignedPort: number };
  try {
    info = (await bgSend(KIND.helloInfo)) as {
      hello: Hello;
      assignedPort: number;
    };
  } catch {
    scheduleReconnect();
    return;
  }

  const socket = new WebSocket(`ws://${mcpConfig.host}:${info.assignedPort}`);
  ws = socket;
  peer = new Peer(
    browserSocket(socket),
    {
      onRequest: (type, payload) => bgSend(KIND.exec, { type, payload }),
      onClose: () => {
        reportStatus(false);
        peer = null;
        if (!closedByUs) scheduleReconnect();
      },
    },
    { defaultTimeoutMs: mcpConfig.defaultTimeoutMs },
  );

  socket.addEventListener("open", () => {
    void (async () => {
      try {
        const raw = await peer!.request("hello", info.hello, {
          timeoutMs: 10_000,
        });
        const ack = HelloAckSchema.parse(raw);
        if (ack.ok) {
          attempt = 0;
          reportStatus(true);
        } else {
          reportStatus(false);
          console.error("[offscreen] hello rejected:", ack.reason);
          closeCurrent();
        }
      } catch (err) {
        console.error("[offscreen] handshake failed:", err);
        closeCurrent();
      }
    })();
  });
}

// Service-worker -> offscreen messages.
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.to !== TO.offscreen) {
    return undefined;
  }
  if (msg.kind === KIND.tabsPush) {
    peer?.notify("tabs_changed", { tabs: msg.tabs });
  } else if (msg.kind === KIND.reconnect) {
    closeCurrent();
    attempt = 0;
    setTimeout(() => void connect(), 100);
  }
  return undefined;
});

void connect();
