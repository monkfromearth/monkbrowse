import type { ConnectionRegistry, ProfileConnection } from "../registry";

export interface SnapshotResult {
  tabId: number;
  content: { type: "text"; text: string }[];
}

/**
 * Capture the accessibility snapshot for a resolved tab. Returns url + title +
 * ARIA yaml in one round-trip so all three describe the SAME tab (the original
 * chained three separate calls, which could straddle a tab change).
 */
export async function captureAriaSnapshot(
  registry: ConnectionRegistry,
  conn: ProfileConnection,
  tabId?: number,
): Promise<SnapshotResult> {
  const res = await registry.send(conn, "browser_snapshot", { tabId });
  const text = [
    `- Page URL: ${res.url}`,
    `- Page Title: ${res.title}`,
    `- Page Snapshot`,
    "```yaml",
    res.snapshot,
    "```",
  ].join("\n");
  return { tabId: res.tabId, content: [{ type: "text", text }] };
}
