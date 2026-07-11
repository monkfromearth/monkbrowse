import { describe, expect, test } from "bun:test";

import { TargetQueueManager } from "../src/queue";

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("TargetQueueManager", () => {
  test("serializes same-key work (no interleave)", async () => {
    const q = new TargetQueueManager();
    const events: string[] = [];
    const task = (name: string, ms: number) => async () => {
      events.push(`${name}:start`);
      await tick(ms);
      events.push(`${name}:end`);
    };
    const a = q.enqueue("9222:1", task("A", 30));
    const b = q.enqueue("9222:1", task("B", 5));
    await Promise.all([a, b]);
    // B must not start until A ends
    expect(events).toEqual(["A:start", "A:end", "B:start", "B:end"]);
  });

  test("different keys run concurrently", async () => {
    const q = new TargetQueueManager();
    const order: string[] = [];
    const a = q.enqueue("9222:1", async () => {
      await tick(30);
      order.push("A");
    });
    const b = q.enqueue("9223:1", async () => {
      await tick(5);
      order.push("B");
    });
    await Promise.all([a, b]);
    // B (different key, shorter) finishes first despite being queued second
    expect(order).toEqual(["B", "A"]);
  });

  test("a rejecting task doesn't block the next on the same key", async () => {
    const q = new TargetQueueManager();
    const failing = q.enqueue("k", async () => {
      throw new Error("boom");
    });
    await expect(failing).rejects.toThrow("boom");
    const ok = await q.enqueue("k", async () => 42);
    expect(ok).toBe(42);
  });

  test("returns each task's own resolved value", async () => {
    const q = new TargetQueueManager();
    const [a, b] = await Promise.all([
      q.enqueue("k", async () => "first"),
      q.enqueue("k", async () => "second"),
    ]);
    expect([a, b]).toEqual(["first", "second"]);
  });
});
