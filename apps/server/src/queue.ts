/**
 * Serializes async work per key. Different keys run in parallel; same-key calls
 * run one at a time in FIFO order.
 *
 * Used to serialize mutating tool calls against the SAME tab (key
 * "<port>:<tabId>") so a type-then-click never interleaves, while calls to
 * different tabs or profiles stay fully concurrent.
 */
export class TargetQueueManager {
  private readonly tails = new Map<string, Promise<unknown>>();

  enqueue<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.tails.get(key) ?? Promise.resolve();
    // Run `fn` after the previous task settles (success or failure).
    const run = prev.then(fn, fn);
    // The stored tail never rejects, so the chain can't break on one failure.
    const tail = run.then(
      () => undefined,
      () => undefined,
    );
    this.tails.set(key, tail);
    void tail.then(() => {
      if (this.tails.get(key) === tail) {
        this.tails.delete(key);
      }
    });
    return run;
  }
}
