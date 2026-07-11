import type { TabInfo } from "@monkbrowse/protocol";

/** Enumerate all tabs across all windows in this Chrome profile. */
export async function enumerateTabs(): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({});
  return tabs
    .filter((t) => t.id != null)
    .map((t) => ({
      tabId: t.id as number,
      url: t.url ?? "",
      title: t.title ?? "",
      active: Boolean(t.active),
      windowId: t.windowId,
    }));
}
