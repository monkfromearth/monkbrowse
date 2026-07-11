import { wait } from "@monkbrowse/utils";

import { isShared, setShared } from "./shares";
import { enumerateSharedTabs } from "./tabs";

/**
 * Service-worker side. Executes a single wire request (by type + payload) using
 * Chrome APIs, returning the protocol response. Tab-scoped requests resolve an
 * explicit `tabId` or fall back to the active tab, and echo the resolved tabId.
 *
 * DOM operations are delegated to the target tab's content script; navigation,
 * tab, and screenshot operations run here directly.
 */
export async function execWire(
  type: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  switch (type) {
    case "browser_navigate": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      await chrome.tabs.update(tabId, { url: String(payload.url) });
      await waitForLoad(tabId);
      return { tabId };
    }
    case "browser_go_back": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      await chrome.tabs.goBack(tabId);
      await waitForLoad(tabId);
      return { tabId };
    }
    case "browser_go_forward": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      await chrome.tabs.goForward(tabId);
      await waitForLoad(tabId);
      return { tabId };
    }
    case "browser_snapshot": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      const r = (await cs(tabId, { kind: "snapshot" })) as {
        url: string;
        title: string;
        snapshot: string;
      };
      return { tabId, url: r.url, title: r.title, snapshot: r.snapshot };
    }
    case "getUrl": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      const t = await chrome.tabs.get(tabId);
      return { tabId, url: t.url ?? "" };
    }
    case "getTitle": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      const t = await chrome.tabs.get(tabId);
      return { tabId, title: t.title ?? "" };
    }
    case "browser_click": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      await cs(tabId, { kind: "click", ref: payload.ref });
      return { tabId };
    }
    case "browser_hover": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      await cs(tabId, { kind: "hover", ref: payload.ref });
      return { tabId };
    }
    case "browser_type": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      await cs(tabId, {
        kind: "type",
        ref: payload.ref,
        text: payload.text,
        submit: payload.submit,
      });
      return { tabId };
    }
    case "browser_select_option": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      await cs(tabId, {
        kind: "select_option",
        ref: payload.ref,
        values: payload.values,
      });
      return { tabId };
    }
    case "browser_press_key": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      await cs(tabId, { kind: "press_key", key: payload.key });
      return { tabId };
    }
    case "browser_get_console_logs": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      const logs = await cs(tabId, { kind: "console" });
      return { tabId, logs };
    }
    case "browser_screenshot": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      const tab = await chrome.tabs.get(tabId);
      // captureVisibleTab only grabs the active tab — bring the target to front.
      if (!tab.active) {
        await chrome.tabs.update(tabId, { active: true });
        await wait(180);
      }
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: "png",
      });
      return { tabId, data: dataUrl.replace(/^data:image\/png;base64,/, "") };
    }
    case "browser_reload": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      await chrome.tabs.reload(tabId);
      await waitForLoad(tabId);
      return { tabId };
    }
    case "browser_scroll": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      await cs(tabId, {
        kind: "scroll",
        direction: payload.direction,
        amount: payload.amount,
        ref: payload.ref,
      });
      return { tabId };
    }
    case "browser_get_text": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      const r = (await cs(tabId, { kind: "get_text", ref: payload.ref })) as {
        text: string;
      };
      return { tabId, text: r.text };
    }
    case "browser_evaluate": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      const r = (await cs(tabId, {
        kind: "evaluate",
        expression: payload.expression,
      })) as { result: unknown };
      return { tabId, result: r.result };
    }
    case "browser_drag": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      await cs(tabId, {
        kind: "drag",
        startRef: payload.startRef,
        endRef: payload.endRef,
      });
      return { tabId };
    }
    case "browser_upload_file": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      await cs(tabId, {
        kind: "upload",
        ref: payload.ref,
        name: payload.name,
        data: payload.data,
      });
      return { tabId };
    }
    case "browser_new_tab": {
      const created = await chrome.tabs.create({
        url: payload.url ? String(payload.url) : undefined,
      });
      const tabId = created.id as number;
      await setShared(tabId, true); // auto-share tabs the AI opens
      if (payload.url) await waitForLoad(tabId);
      const shared = await enumerateSharedTabs();
      const info = shared.find((t) => t.tabId === tabId);
      return { tabId, slot: info?.slot ?? 0 };
    }
    case "browser_close_tab": {
      const tabId = await resolveTab(payload.tabId as number | undefined);
      await setShared(tabId, false);
      await chrome.tabs.remove(tabId);
      return { tabId };
    }
    case "list_tabs": {
      return { tabs: await enumerateSharedTabs() };
    }
    case "browser_switch_tab": {
      const tabId = Number(payload.tabId);
      const tab = await chrome.tabs.get(tabId);
      await chrome.tabs.update(tabId, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      return { activeTabId: tabId };
    }
    default:
      throw new Error(`Unknown wire request "${type}"`);
  }
}

async function resolveTab(explicit?: number): Promise<number> {
  const tabId = await pickTab(explicit);
  // Safety net: never act on a tab the user hasn't shared with the AI.
  if (!(await isShared(tabId))) {
    throw new Error(
      `Tab ${tabId} isn't shared with the AI. Open the monkbrowse popup and toggle it on.`,
    );
  }
  return tabId;
}

async function pickTab(explicit?: number): Promise<number> {
  if (explicit != null) {
    const tab = await chrome.tabs.get(explicit).catch(() => null);
    if (!tab || tab.id == null) {
      throw new Error(`Tab ${explicit} not found in this profile`);
    }
    return tab.id;
  }
  const [active] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (active?.id != null) {
    return active.id;
  }
  const [anyActive] = await chrome.tabs.query({ active: true });
  if (anyActive?.id != null) {
    return anyActive.id;
  }
  throw new Error("No active tab in this profile");
}

/** Send a message to a tab's content script, injecting it first if needed. */
async function cs(
  tabId: number,
  msg: Record<string, unknown>,
): Promise<unknown> {
  await ensureContentScript(tabId);
  const res = (await chrome.tabs.sendMessage(tabId, { cs: true, ...msg })) as
    | { ok: true; result: unknown }
    | { ok: false; error: string }
    | undefined;
  if (!res) {
    throw new Error("No response from page (content script unavailable)");
  }
  if (!res.ok) {
    throw new Error(res.error);
  }
  return res.result;
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    const pong = await chrome.tabs.sendMessage(tabId, { cs: true, kind: "ping" });
    if (pong) return;
  } catch {
    // not injected yet
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content-scripts/content.js"],
    });
  } catch (err) {
    throw new Error(
      `Cannot control tab ${tabId} (${err instanceof Error ? err.message : "injection failed"}). Chrome blocks scripting on internal pages like chrome:// and the Web Store.`,
    );
  }
}

/** Resolve once the tab finishes loading (or after a timeout). */
function waitForLoad(tabId: number, timeoutMs = 15_000): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(timer);
      resolve();
    };
    const listener = (
      updatedTabId: number,
      info: chrome.tabs.TabChangeInfo,
    ) => {
      if (updatedTabId === tabId && info.status === "complete") {
        finish();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    const timer = setTimeout(finish, timeoutMs);
    // In case it's already complete.
    chrome.tabs.get(tabId).then(
      (t) => {
        if (t.status === "complete") finish();
      },
      () => finish(),
    );
  });
}
