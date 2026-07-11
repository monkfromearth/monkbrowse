/**
 * Transport-agnostic request/response messaging peer.
 *
 * Zero dependencies, no `ws`, no `node:*`, no DOM types — so it type-checks and
 * bundles for BOTH the Node/Bun server and the MV3 service worker. The caller
 * injects a {@link PeerSocket} adapter around whichever WebSocket it has.
 */

/** Minimal socket surface the peer needs. Adapt your native socket to this. */
export interface PeerSocket {
  send(data: string): void;
  close(): void;
  onMessage(cb: (data: string) => void): void;
  onClose(cb: () => void): void;
}

export interface PeerHandlers {
  /** Handle an incoming request; the returned value becomes the response. */
  onRequest?: (type: string, payload: unknown) => Promise<unknown> | unknown;
  /** Handle an incoming fire-and-forget notification. */
  onNotify?: (type: string, payload: unknown) => void;
  /** Called once when the socket closes. */
  onClose?: () => void;
}

export interface PeerOptions {
  defaultTimeoutMs?: number;
}

export interface RequestOptions {
  timeoutMs?: number;
}

/** Thrown when a request exceeds its timeout. */
export class RequestTimeoutError extends Error {
  constructor(public readonly type: string, timeoutMs: number) {
    super(`Request "${type}" timed out after ${timeoutMs}ms`);
    this.name = "RequestTimeoutError";
  }
}

type Frame =
  | { k: "req"; id: string; type: string; payload: unknown }
  | { k: "res"; id: string; ok: true; result: unknown }
  | { k: "res"; id: string; ok: false; error: string }
  | { k: "ntf"; type: string; payload: unknown }
  | { k: "png" }
  | { k: "pog" };

interface Pending {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class Peer {
  private readonly socket: PeerSocket;
  private readonly handlers: PeerHandlers;
  private readonly defaultTimeoutMs: number;
  private readonly pending = new Map<string, Pending>();
  private readonly pingWaiters: Pending[] = [];
  private seq = 0;
  private closed = false;

  constructor(socket: PeerSocket, handlers: PeerHandlers = {}, opts: PeerOptions = {}) {
    this.socket = socket;
    this.handlers = handlers;
    this.defaultTimeoutMs = opts.defaultTimeoutMs ?? 30_000;
    socket.onMessage((data) => this.onMessage(data));
    socket.onClose(() => this.handleClose());
  }

  /** Send a request and await its response. */
  request<T = unknown>(
    type: string,
    payload: unknown,
    opts: RequestOptions = {},
  ): Promise<T> {
    const timeoutMs = opts.timeoutMs ?? this.defaultTimeoutMs;
    const id = String(++this.seq);
    return new Promise<T>((resolve, reject) => {
      if (this.closed) {
        reject(new Error("Peer is closed"));
        return;
      }
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new RequestTimeoutError(type, timeoutMs));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer,
      });
      this.write({ k: "req", id, type, payload });
    });
  }

  /** Send a fire-and-forget notification (no response expected). */
  notify(type: string, payload: unknown): void {
    if (this.closed) {
      return;
    }
    this.write({ k: "ntf", type, payload });
  }

  /** Round-trip liveness check. Resolves on the matching pong. */
  ping(timeoutMs = 5_000): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.closed) {
        reject(new Error("Peer is closed"));
        return;
      }
      const timer = setTimeout(() => {
        const idx = this.pingWaiters.findIndex((w) => w.timer === timer);
        if (idx >= 0) {
          this.pingWaiters.splice(idx, 1);
        }
        reject(new RequestTimeoutError("ping", timeoutMs));
      }, timeoutMs);
      this.pingWaiters.push({
        resolve: () => resolve(),
        reject,
        timer,
      });
      this.write({ k: "png" });
    });
  }

  /** Reject every in-flight request/ping (e.g. on disconnect). */
  rejectAllPending(reason: string): void {
    const err = new Error(reason);
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    this.pending.clear();
    for (const w of this.pingWaiters) {
      clearTimeout(w.timer);
      w.reject(err);
    }
    this.pingWaiters.length = 0;
  }

  close(): void {
    if (this.closed) {
      return;
    }
    this.socket.close();
    this.handleClose();
  }

  private write(frame: Frame): void {
    try {
      this.socket.send(JSON.stringify(frame));
    } catch {
      // Socket is gone; the close handler will reject pending work.
    }
  }

  private handleClose(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.rejectAllPending("Peer disconnected");
    this.handlers.onClose?.();
  }

  private onMessage(data: string): void {
    let frame: Frame;
    try {
      frame = JSON.parse(data) as Frame;
    } catch {
      return; // ignore malformed frames
    }
    switch (frame.k) {
      case "png":
        this.write({ k: "pog" });
        return;
      case "pog": {
        const waiter = this.pingWaiters.shift();
        if (waiter) {
          clearTimeout(waiter.timer);
          waiter.resolve(undefined);
        }
        return;
      }
      case "res": {
        const p = this.pending.get(frame.id);
        if (!p) {
          return; // late/duplicate response
        }
        this.pending.delete(frame.id);
        clearTimeout(p.timer);
        if (frame.ok) {
          p.resolve(frame.result);
        } else {
          p.reject(new Error(frame.error));
        }
        return;
      }
      case "ntf":
        this.handlers.onNotify?.(frame.type, frame.payload);
        return;
      case "req":
        void this.handleRequest(frame);
        return;
    }
  }

  private async handleRequest(frame: {
    id: string;
    type: string;
    payload: unknown;
  }): Promise<void> {
    if (!this.handlers.onRequest) {
      this.write({
        k: "res",
        id: frame.id,
        ok: false,
        error: `No handler for request "${frame.type}"`,
      });
      return;
    }
    try {
      const result = await this.handlers.onRequest(frame.type, frame.payload);
      this.write({ k: "res", id: frame.id, ok: true, result });
    } catch (err) {
      this.write({
        k: "res",
        id: frame.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
