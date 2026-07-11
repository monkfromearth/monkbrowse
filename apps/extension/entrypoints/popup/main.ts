import { KIND, TO } from "../../lib/constants";
import { getIdentity, saveSettings } from "../../lib/identity";
import type { PopupTab } from "../../lib/tabs";

const portInput = document.getElementById("port") as HTMLInputElement;
const labelInput = document.getElementById("label") as HTMLInputElement;
const pill = document.getElementById("pill")!;
const statusText = document.getElementById("statusText")!;
const saved = document.getElementById("saved")!;
const tabList = document.getElementById("tabList")!;
const tabCount = document.getElementById("tabCount")!;

async function bg(kind: string, extra: Record<string, unknown> = {}): Promise<unknown> {
  const res = (await chrome.runtime.sendMessage({ to: TO.bg, kind, ...extra })) as
    | { ok: true; result: unknown }
    | { ok: false; error: string }
    | undefined;
  return res?.ok ? res.result : undefined;
}

function paintStatus(connected: boolean): void {
  pill.classList.toggle("live", connected);
  statusText.textContent = connected ? "Connected" : "Not connected";
}

async function refreshStatus(): Promise<void> {
  const state = (await bg(KIND.getState)) as { connected: boolean } | undefined;
  paintStatus(Boolean(state?.connected));
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function renderTabs(tabs: PopupTab[]): void {
  tabList.replaceChildren();
  const sharedCount = tabs.filter((t) => t.shared).length;
  tabCount.textContent = tabs.length ? `${sharedCount} shared` : "";
  if (!tabs.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No tabs.";
    tabList.append(empty);
    return;
  }

  for (const t of tabs) {
    const row = document.createElement("div");
    row.className = `row${t.active ? " active" : ""}`;

    const badge = document.createElement("div");
    badge.className = `badge${t.shared ? "" : " off"}`;
    badge.textContent = t.shared && t.slot != null ? String(t.slot) : "–";

    const meta = document.createElement("div");
    meta.className = "meta";
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = t.title || "(untitled)"; // textContent: page titles are untrusted
    const host = document.createElement("div");
    host.className = "host";
    host.textContent = hostOf(t.url);
    if (t.active) {
      const live = document.createElement("span");
      live.className = "live";
      live.textContent = " · active";
      host.append(live);
    }
    meta.append(title, host);

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "share";
    cb.checked = t.shared;
    cb.title = t.shared ? "Shared with the AI" : "Share with the AI";
    cb.addEventListener("change", async () => {
      cb.disabled = true;
      const res = (await bg(KIND.toggleShare, {
        tabId: t.tabId,
        shared: cb.checked,
      })) as { tabs: PopupTab[] } | undefined;
      if (res) renderTabs(res.tabs);
    });

    row.append(badge, meta, cb);
    tabList.append(row);
  }
}

async function loadTabs(): Promise<void> {
  const res = (await bg(KIND.listTabs)) as { tabs: PopupTab[] } | undefined;
  renderTabs(res?.tabs ?? []);
}

async function load(): Promise<void> {
  const { port, label } = await getIdentity();
  portInput.value = String(port);
  labelInput.value = label;
  await Promise.all([refreshStatus(), loadTabs()]);
}

document.getElementById("save")!.addEventListener("click", async () => {
  const port = Number(portInput.value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    portInput.focus();
    return;
  }
  await saveSettings(port, labelInput.value || `Profile @${port}`);
  await chrome.runtime.sendMessage({ to: TO.bg, kind: KIND.settingsChanged });
  saved.classList.add("show");
  for (const delay of [400, 900, 1600]) setTimeout(refreshStatus, delay);
  setTimeout(() => saved.classList.remove("show"), 2000);
});

void load();
