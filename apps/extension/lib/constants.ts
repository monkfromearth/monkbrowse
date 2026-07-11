/** chrome.storage.local keys. */
export const STORAGE = {
  profileId: "profileId",
  port: "wsPort",
  label: "label",
} as const;

/** Internal message routing between the service worker, offscreen doc, and UI. */
export const TO = {
  bg: "bg",
  offscreen: "off",
} as const;

/** Internal message kinds (SW <-> offscreen <-> UI). */
export const KIND = {
  exec: "exec", // offscreen -> bg: run a wire request, return its response
  helloInfo: "hello-info", // offscreen -> bg: gather the hello payload
  socketStatus: "socket-status", // offscreen -> bg: report connected/disconnected
  tabsPush: "tabs-push", // bg -> offscreen: forward tabs_changed
  reconnect: "reconnect", // bg -> offscreen: settings changed, reconnect
  getState: "get-state", // UI -> bg: current connection state
  listTabs: "list-tabs", // UI -> bg: this profile's tabs (all, with shared flag)
  toggleShare: "toggle-share", // UI -> bg: share/unshare a tab with the AI
  settingsChanged: "settings-changed", // UI -> bg: options saved
} as const;

/** The built offscreen document URL (WXT emits entrypoints/offscreen -> offscreen.html). */
export const OFFSCREEN_URL = "offscreen.html";

/** Keepalive alarm name. */
export const KEEPALIVE_ALARM = "monkbrowse-keepalive";
