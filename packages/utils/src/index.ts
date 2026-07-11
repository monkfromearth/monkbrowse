/** Resolve after `ms` milliseconds. */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff with full jitter, clamped to `maxMs`.
 * attempt 0 -> ~baseMs, attempt 1 -> ~2*baseMs, ... capped at maxMs.
 */
export function backoffDelay(
  attempt: number,
  baseMs = 1_000,
  maxMs = 30_000,
  rng: () => number = Math.random,
): number {
  const exp = Math.min(baseMs * 2 ** attempt, maxMs);
  return Math.floor(rng() * exp);
}

/** Format a profile+tab pair into a stable composite id string ("9223:5417"). */
export function compositeTabId(port: number, tabId: number): string {
  return `${port}:${tabId}`;
}

/** Parse a composite id ("9223:5417") back into its parts, or null if malformed. */
export function parseCompositeTabId(
  value: string,
): { port: number; tabId: number } | null {
  const match = /^(\d+):(\d+)$/.exec(value);
  if (!match) {
    return null;
  }
  return { port: Number(match[1]), tabId: Number(match[2]) };
}
