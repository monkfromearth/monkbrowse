import { defineBackground } from "#imports";

import type { Hello } from "@monkbrowse/protocol";

import { KEEPALIVE_ALARM, KIND, OFFSCREEN_URL, TO } from "../lib/constants";
import { execWire } from "../lib/executor";
import { getIdentity } from "../lib/identity";
import { setShared } from "../lib/shares";
import { enumeratePopupTabs, enumerateSharedTabs } from "../lib/tabs";

export default defineBackground(() => {
  let connected = false;
  let currentPort: number | null = null;
  let currentLabel = "";
  let pushTimer: ReturnType<typeof setTimeout> | null = null;

  // --- offscreen document (owns the WebSocket, survives SW suspension) ---
  async function ensureOffscreen(): Promise<void> {
    const existing = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    });
    if (existing.length > 0) {
      return;
    }
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: "Persistent WebSocket connection to the Monkbrowse server",
    });
  }

  function setBadge(isConnected: boolean): void {
    chrome.action.setBadgeText({ text: isConnected ? "on" : "" });
    chrome.action.setBadgeBackgroundColor({ color: "#16a34a" });
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
        setBadge(connected);
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
      case KIND.settingsChanged:
        // Tell the offscreen doc to reconnect with the new port/label.
        chrome.runtime.sendMessage({ to: TO.offscreen, kind: KIND.reconnect });
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

  // --- push the SHARED tab list to the offscreen doc (server-facing) ---
  async function pushSharedTabs(): Promise<void> {
    if (!connected) return;
    chrome.runtime.sendMessage({
      to: TO.offscreen,
      kind: KIND.tabsPush,
      tabs: await enumerateSharedTabs(),
    });
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
  chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: 0.4 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === KEEPALIVE_ALARM) {
      void ensureOffscreen();
    }
  });

  chrome.runtime.onStartup.addListener(() => void ensureOffscreen());
  chrome.runtime.onInstalled.addListener(() => void ensureOffscreen());
  void ensureOffscreen();
});
