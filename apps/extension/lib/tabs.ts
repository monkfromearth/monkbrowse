import type { TabInfo } from "@monkbrowse/protocol";

import { sharedSet, sharedSlots } from "./shares";

/**
 * The single tab the user is actually looking at (active in the last-focused
 * window). `tab.active` is true once PER window, so it can't be used alone to
 * mean "the focused tab" — that would make defaultSharedTab pick an arbitrary
 * window. Returns undefined if nothing is focused.
 */
async function focusedTabId(): Promise<number | undefined> {
  const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return t?.id ?? undefined;
}

/**
 * Server-facing: only the tabs the user has shared, each with its number.
 * This is what the AI sees (hello, list_tabs, tabs_changed).
 */
export async function enumerateSharedTabs(): Promise<TabInfo[]> {
  const tabs = (await chrome.tabs.query({})).filter((t) => t.id != null);
  const slots = await sharedSlots(tabs.map((t) => t.id as number));
  const focused = await focusedTabId();
  return tabs
    .filter((t) => slots.has(t.id as number))
    .map((t) => ({
      tabId: t.id as number,
      slot: slots.get(t.id as number) as number,
      url: t.url ?? "",
      title: t.title ?? "",
      active: t.id === focused,
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
  const focused = await focusedTabId();
  return tabs.map((t) => ({
    tabId: t.id as number,
    slot: slots.get(t.id as number) ?? null,
    title: t.title ?? "",
    url: t.url ?? "",
    active: t.id === focused,
    shared: shared.has(t.id as number),
  }));
}
