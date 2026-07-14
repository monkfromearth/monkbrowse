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
// Each connect() bumps this. A socket only reconnects if it's still the current
// generation — so a superseded socket's late `close` can't spawn a rival socket
// (the old reconnect-storm bug). `stopped` freezes reconnects (e.g. on conflict).
let generation = 0;
let stopped = false;

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

function scheduleReconnect(gen: number): void {
  const delay = backoffDelay(attempt++, 1_000, 30_000);
  setTimeout(() => {
    if (gen === generation && !stopped) void connect();
  }, delay);
}

async function connect(): Promise<void> {
  const gen = ++generation; // this call is now the active generation
  stopped = false;
  // Drop any prior socket; its onClose sees a stale gen and won't reconnect.
  try {
    ws?.close();
  } catch {
    // already closing
  }
  ws = null;
  peer = null;

  let info: { hello: Hello; assignedPort: number };
  try {
    info = (await bgSend(KIND.helloInfo)) as {
      hello: Hello;
      assignedPort: number;
    };
  } catch {
    scheduleReconnect(gen);
    return;
  }
  if (gen !== generation) return; // superseded while awaiting

  const socket = new WebSocket(`ws://${mcpConfig.host}:${info.assignedPort}`);
  ws = socket;
  const p = new Peer(
    browserSocket(socket),
    {
      onRequest: (type, payload) => bgSend(KIND.exec, { type, payload }),
      onClose: () => {
        if (gen !== generation) return; // a newer socket has taken over
        reportStatus(false);
        peer = null;
        if (!stopped) scheduleReconnect(gen);
      },
    },
    { defaultTimeoutMs: mcpConfig.defaultTimeoutMs },
  );
  peer = p;

  socket.addEventListener("open", () => {
    void (async () => {
      if (gen !== generation) {
        socket.close();
        return;
      }
      try {
        const ack = HelloAckSchema.parse(
          await p.request("hello", info.hello, { timeoutMs: 10_000 }),
        );
        if (ack.ok) {
          attempt = 0;
          reportStatus(true);
        } else {
          // Port conflict etc. Don't retry until the user changes settings.
          console.error("[offscreen] hello rejected:", ack.reason);
          stopped = true;
          reportStatus(false);
          socket.close();
        }
      } catch (err) {
        // Transient handshake failure — let onClose schedule a reconnect.
        console.error("[offscreen] handshake failed:", err);
        socket.close();
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
    attempt = 0;
    void connect(); // supersedes + reconnects with fresh settings
  } else if (msg.kind === KIND.statusQuery) {
    // A restarted service worker is asking whether we're connected.
    reportStatus(peer != null && !stopped);
  }
  return undefined;
});

void connect();
