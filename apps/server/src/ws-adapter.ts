import type { WebSocket } from "ws";

import type { PeerSocket } from "@monkbrowse/messaging";

/**
 * Adapt a Node `ws` WebSocket to the transport-agnostic {@link PeerSocket} the
 * messaging peer expects. This is the only place `ws` meets the messaging layer.
 */
export function wsToPeerSocket(ws: WebSocket): PeerSocket {
  return {
    send(data) {
      ws.send(data);
    },
    close() {
      try {
        ws.close();
      } catch {
        // already closing/closed
      }
    },
    onMessage(cb) {
      ws.on("message", (data: unknown) => {
        cb(typeof data === "string" ? data : String(data));
      });
    },
    onClose(cb) {
      ws.on("close", () => cb());
    },
  };
}
