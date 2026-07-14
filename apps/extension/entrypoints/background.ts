import { defineBackground } from "#imports";

import type { Hello } from "@monkbrowse/protocol";

import { KEEPALIVE_ALARM, KIND, OFFSCREEN_URL, TO } from "../lib/constants";
import { execWire } from "../lib/executor";
import { getIdentity } from "../lib/identity";
import { setManyShared, setShared } from "../lib/shares";
import { enumeratePopupTabs, enumerateSharedTabs } from "../lib/tabs";

export default defineBackground(() => {
  let connected = false;
  let currentPort: number | null = null;
  let currentLabel = "";
  let pushTimer: ReturnType<typeof setTimeout> | null = null;

  // --- offscreen document (owns the WebSocket, survives SW suspension) ---
  // Several startup paths call this at once (onStartup/onInstalled/alarm/init);
  // dedupe so we never race two createDocument() calls (Chrome allows only one).
  let creatingOffscreen: Promise<void> | null = null;
  async function ensureOffscreen(): Promise<void> {
    const existing = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    });
    if (existing.length > 0) {
      return;
    }
    if (creatingOffscreen) {
      return creatingOffscreen;
    }
    creatingOffscreen = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_URL,
        reasons: [chrome.offscreen.Reason.WORKERS],
        justification:
          "Persistent WebSocket connection to the Monkbrowse server",
      })
      .catch((err: unknown) => {
        // A concurrent caller won the race — that's fine.
        if (!/single offscreen/i.test(String(err))) throw err;
      })
      .finally(() => {
        creatingOffscreen = null;
      });
    return creatingOffscreen;
  }

  // Badge shows the count of tabs the AI can use (the number that matters),
  // green while connected, grey when offline. Empty when nothing is shared.
  let sharedCount = 0;
  function paintBadge(): void {
    chrome.action.setBadgeText({ text: sharedCount > 0 ? String(sharedCount) : "" });
    chrome.action.setBadgeBackgroundColor({
      color: connected ? "#16a34a" : "#9ca3af",
    });
    chrome.action.setBadgeTextColor?.({ color: "#ffffff" });
  }

  // --- messages from the offscreen doc and the popup/options UI ---
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.to !== TO.bg) {
      return undefined;
    }
    void (async () => {
      try {
        const result = await handleBgMessage(msg);
        sendResponse({ ok: true, result });
      } catch (err) {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return true;
  });

  async function handleBgMessage(msg: {
    kind: string;
    [k: string]: unknown;
  }): Promise<unknown> {
    switch (msg.kind) {
      case KIND.exec:
        return execWire(
          String(msg.type),
          (msg.payload as Record<string, unknown>) ?? {},
        );
      case KIND.helloInfo: {
        const hello = await buildHello();
        currentPort = hello.assignedPort;
        currentLabel = hello.hello.label;
        return hello;
      }
      case KIND.socketStatus:
        connected = Boolean(msg.connected);
        paintBadge();
        return { ok: true };
      case KIND.getState:
        return {
          connected,
          port: currentPort,
          label: currentLabel,
        };
      case KIND.listTabs:
        return { tabs: await enumeratePopupTabs() };
      case KIND.toggleShare: {
        await setShared(Number(msg.tabId), Boolean(msg.shared));
        await pushSharedTabs();
        return { tabs: await enumeratePopupTabs() };
      }
      case KIND.shareAll: {
        const tabs = await chrome.tabs.query({});
        const ids = tabs.map((t) => t.id).filter((id): id is number => id != null);
        await setManyShared(ids, Boolean(msg.shared));
        await pushSharedTabs();
        return { tabs: await enumeratePopupTabs() };
      }
      case KIND.activateTab: {
        // Jump Chrome to a tab (focus its window + select it).
        const tab = await chrome.tabs.get(Number(msg.tabId));
        await chrome.tabs.update(Number(msg.tabId), { active: true });
        if (tab.windowId != null) {
          await chrome.windows.update(tab.windowId, { focused: true });
        }
        return { ok: true };
      }
      case KIND.settingsChanged:
        // Tell the offscreen doc to reconnect with the new port/label.
        chrome.runtime
          .sendMessage({ to: TO.offscreen, kind: KIND.reconnect })
          .catch(() => {});
        return { ok: true };
      default:
        throw new Error(`Unknown bg message "${msg.kind}"`);
    }
  }

  async function buildHello(): Promise<{
    hello: Hello;
    assignedPort: number;
  }> {
    const { profileId, port, label } = await getIdentity();
    const tabs = await enumerateSharedTabs();
    const hello: Hello = {
      profileId,
      label,
      extVersion: chrome.runtime.getManifest().version,
      tabs,
    };
    return { hello, assignedPort: port };
  }

  // Ask the offscreen doc to re-report status (the socket survives SW suspension,
  // so after a SW restart `connected` here is stale until we re-sync).
  function syncStatus(): void {
    chrome.runtime
      .sendMessage({ to: TO.offscreen, kind: KIND.statusQuery })
      .catch(() => {});
  }

  // --- push the SHARED tab list to the offscreen doc (server-facing) ---
  // No `connected` gate: after a SW restart that flag is stale, and the send is
  // harmless if the offscreen/socket isn't there (the offscreen forwards to a
  // possibly-null peer, a no-op).
  async function pushSharedTabs(): Promise<void> {
    const tabs = await enumerateSharedTabs();
    sharedCount = tabs.length;
    paintBadge();
    chrome.runtime
      .sendMessage({ to: TO.offscreen, kind: KIND.tabsPush, tabs })
      .catch(() => {});
  }

  function scheduleTabsPush(): void {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushTimer = null;
      void pushSharedTabs();
    }, 250);
  }

  chrome.tabs.onCreated.addListener(scheduleTabsPush);
  chrome.tabs.onRemoved.addListener(scheduleTabsPush);
  chrome.tabs.onActivated.addListener(scheduleTabsPush);
  chrome.tabs.onUpdated.addListener((_id, info) => {
    if (info.status === "complete" || info.title || info.url) {
      scheduleTabsPush();
    }
  });

  // --- keepalive: make sure the offscreen doc (and its socket) is alive ---
  chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: 0.5 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === KEEPALIVE_ALARM) {
      void ensureOffscreen().then(syncStatus);
    }
  });

  const boot = () => {
    void ensureOffscreen().then(syncStatus);
    void pushSharedTabs(); // seed the badge count + hand the socket its tabs
  };
  chrome.runtime.onStartup.addListener(boot);
  chrome.runtime.onInstalled.addListener(boot);
  boot();
});
