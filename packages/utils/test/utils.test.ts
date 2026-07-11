import { describe, expect, test } from "bun:test";

import {
  backoffDelay,
  compositeTabId,
  parseCompositeTabId,
  wait,
} from "../src/index";

describe("wait", () => {
  test("resolves after roughly the given delay", async () => {
    const start = Date.now();
    await wait(30);
    expect(Date.now() - start).toBeGreaterThanOrEqual(25);
  });
});

describe("backoffDelay", () => {
  test("grows exponentially and clamps to max (rng=1)", () => {
    const one = () => 1;
    expect(backoffDelay(0, 1000, 30000, one)).toBe(1000);
    expect(backoffDelay(1, 1000, 30000, one)).toBe(2000);
    expect(backoffDelay(2, 1000, 30000, one)).toBe(4000);
    // 2^6 * 1000 = 64000 -> clamped to 30000
    expect(backoffDelay(6, 1000, 30000, one)).toBe(30000);
  });

  test("full jitter: rng=0 yields 0", () => {
    expect(backoffDelay(5, 1000, 30000, () => 0)).toBe(0);
  });

  test("stays within [0, cap] for arbitrary rng", () => {
    for (let a = 0; a < 10; a++) {
      const d = backoffDelay(a, 1000, 30000, () => 0.5);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(30000);
    }
  });
});

describe("composite tab ids", () => {
  test("round-trips", () => {
    expect(compositeTabId(9223, 5417)).toBe("9223:5417");
    expect(parseCompositeTabId("9223:5417")).toEqual({
      port: 9223,
      tabId: 5417,
    });
  });

  test("rejects malformed", () => {
    expect(parseCompositeTabId("9223")).toBeNull();
    expect(parseCompositeTabId("a:b")).toBeNull();
    expect(parseCompositeTabId("9223:")).toBeNull();
    expect(parseCompositeTabId("")).toBeNull();
  });
});
