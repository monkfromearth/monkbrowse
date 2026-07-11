import type { TabInfo } from "@monkbrowse/protocol";

import { assignSlots } from "./slots";

/** Enumerate all tabs in this Chrome profile, each with a stable slot number. */
export async function enumerateTabs(): Promise<TabInfo[]> {
  const tabs = (await chrome.tabs.query({})).filter((t) => t.id != null);
  const slots = await assignSlots(tabs.map((t) => t.id as number));
  return tabs
    .map((t) => ({
      tabId: t.id as number,
      slot: slots.get(t.id as number) ?? 0,
      url: t.url ?? "",
      title: t.title ?? "",
      active: Boolean(t.active),
      windowId: t.windowId,
    }))
    .sort((a, b) => a.slot - b.slot);
}
