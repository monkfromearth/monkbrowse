import { WebSocket, WebSocketServer } from "ws";

import { mcpConfig } from "@monkbrowse/config/mcp.config";
import { Peer } from "@monkbrowse/messaging";
import { CONTROL, HelloSchema, TabsChangedSchema } from "@monkbrowse/protocol";
import { wait } from "@monkbrowse/utils";

import { debugLog } from "./log";
import { isPortInUse, killStaleProcessOnPort } from "./port";
import type { ConnectionRegistry } from "./registry";
import { wsToPeerSocket } from "./ws-adapter";

const HELLO_TIMEOUT_MS = 10_000;

/** Bind one WebSocketServer per configured port and wire the handshake. */
export async function startListeners(
  registry: ConnectionRegistry,
  ports: number[],
  host: string = mcpConfig.host,
): Promise<WebSocketServer[]> {
  const servers: WebSocketServer[] = [];
  for (const port of ports) {
    killStaleProcessOnPort(port);
    let tries = 0;
    while ((await isPortInUse(port, host)) && tries++ < 20) {
      await wait(100);
    }
    const wss = new WebSocketServer({ port, host });
    wss.on("connection", (ws) => handleConnection(registry, port, ws));
    wss.on("error", (err) => debugLog(`[ws:${port}] server error:`, err));
    servers.push(wss);
  }
  debugLog(
    `[ws] listening on ${host}:${ports[0]}-${ports[ports.length - 1]} (${ports.length} profile ports)`,
  );
  return servers;
}

function handleConnection(
  registry: ConnectionRegistry,
  port: number,
  ws: WebSocket,
): void {
  let adopted = false;
  let helloTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const stopTimers = () => {
    if (helloTimer) {
      clearTimeout(helloTimer);
      helloTimer = null;
    }
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  };

  const peer = new Peer(
    wsToPeerSocket(ws),
    {
      onRequest: async (type, payload) => {
        if (type === CONTROL.hello) {
          const hello = HelloSchema.parse(payload);
          const ack = registry.handleHello(port, peer, hello);
          if (ack.ok) {
            adopted = true;
            if (helloTimer) {
              clearTimeout(helloTimer);
              helloTimer = null;
            }
            pingTimer = startPing(peer, () => stopTimers());
          } else {
            // Deliver the rejection ack, then drop the socket.
            setTimeout(() => peer.close(), 50);
          }
          return ack;
        }
        throw new Error(`Unexpected request "${type}" before hello`);
      },
      onNotify: (type, payload) => {
        if (type === CONTROL.tabsChanged) {
          const { tabs } = TabsChangedSchema.parse(payload);
          registry.handleTabsChanged(port, peer, tabs);
        }
      },
      onClose: () => {
        stopTimers();
        registry.handleDisconnect(port, peer);
      },
    },
    { defaultTimeoutMs: mcpConfig.defaultTimeoutMs },
  );

  // Drop sockets that never identify themselves.
  helloTimer = setTimeout(() => {
    if (!adopted) {
      debugLog(`[ws:${port}] closing unidentified socket (no hello)`);
      peer.close();
    }
  }, HELLO_TIMEOUT_MS);
}

/** Server -> extension liveness pings; close after too many misses. */
function startPing(
  peer: Peer,
  onDead: () => void,
): ReturnType<typeof setInterval> {
  let missed = 0;
  const timer = setInterval(() => {
    peer.ping(mcpConfig.pingIntervalMs).then(
      () => {
        missed = 0;
      },
      () => {
        missed += 1;
        if (missed >= mcpConfig.maxMissedPongs) {
          onDead();
          peer.close();
        }
      },
    );
  }, mcpConfig.pingIntervalMs);
  return timer;
}
