import type { TabInfo } from "@monkbrowse/protocol";

import { sharedSet, sharedSlots } from "./shares";

/**
 * Server-facing: only the tabs the user has shared, each with its number.
 * This is what the AI sees (hello, list_tabs, tabs_changed).
 */
export async function enumerateSharedTabs(): Promise<TabInfo[]> {
  const tabs = (await chrome.tabs.query({})).filter((t) => t.id != null);
  const slots = await sharedSlots(tabs.map((t) => t.id as number));
  return tabs
    .filter((t) => slots.has(t.id as number))
    .map((t) => ({
      tabId: t.id as number,
      slot: slots.get(t.id as number) as number,
      url: t.url ?? "",
      title: t.title ?? "",
      active: Boolean(t.active),
      windowId: t.windowId,
    }))
    .sort((a, b) => a.slot - b.slot);
}

/** Popup-facing: every tab, flagged with whether it's shared and its number. */
export interface PopupTab {
  tabId: number;
  slot: number | null;
  title: string;
  url: string;
  active: boolean;
  shared: boolean;
}

export async function enumeratePopupTabs(): Promise<PopupTab[]> {
  const tabs = (await chrome.tabs.query({})).filter((t) => t.id != null);
  const slots = await sharedSlots(tabs.map((t) => t.id as number));
  const shared = await sharedSet();
  return tabs.map((t) => ({
    tabId: t.id as number,
    slot: slots.get(t.id as number) ?? null,
    title: t.title ?? "",
    url: t.url ?? "",
    active: Boolean(t.active),
    shared: shared.has(t.id as number),
  }));
}
