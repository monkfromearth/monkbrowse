import type { PeerSocket } from "@monkbrowse/messaging";

/** Two in-memory PeerSockets wired to each other (no real WebSocket). */
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

export function linkedSockets(): [PeerSocket, PeerSocket] {
  const a = new FakeSocket();
  const b = new FakeSocket();
  a.peer = b;
  b.peer = a;
  return [a, b];
}
