import { KIND, TO } from "../../lib/constants";
import { getIdentity, saveSettings } from "../../lib/identity";
import type { PopupTab } from "../../lib/tabs";

const portInput = document.getElementById("port") as HTMLInputElement;
const labelInput = document.getElementById("label") as HTMLInputElement;
const stat = document.getElementById("stat")!;
const statText = document.getElementById("statText")!;
const list = document.getElementById("list")!;
const count = document.getElementById("count")!;
const hint = document.getElementById("hint")!;
const saved = document.getElementById("saved")!;
const connSummary = document.getElementById("connSummary")!;

async function bg(kind: string, extra: Record<string, unknown> = {}): Promise<unknown> {
  try {
    const res = (await chrome.runtime.sendMessage({ to: TO.bg, kind, ...extra })) as
      | { ok: true; result: unknown }
      | { ok: false; error: string }
      | undefined;
    return res?.ok ? res.result : undefined;
  } catch {
    return undefined;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function displayLabel(port: number, label: string): string {
  return label.trim() || `Chrome (${port})`;
}

async function refreshStatus(): Promise<void> {
  const [{ port, label }, state] = await Promise.all([
    getIdentity(),
    bg(KIND.getState) as Promise<{ connected: boolean } | undefined>,
  ]);
  const connected = Boolean(state?.connected);
  stat.classList.toggle("live", connected);
  statText.textContent = connected ? "Connected" : "Offline";
  connSummary.textContent = `· ${displayLabel(port, label)} · port ${port}`;
}

function tabRow(t: PopupTab): HTMLButtonElement {
  const row = document.createElement("button");
  row.className = `row${t.active ? " active" : ""}`;
  row.setAttribute("role", "listitem");
  row.setAttribute("aria-pressed", String(t.shared));
  row.setAttribute(
    "aria-label",
    `${t.shared ? "Shared" : "Not shared"}: ${t.title || hostOf(t.url)}`,
  );

  const num = document.createElement("span");
  num.className = `num${t.shared ? "" : " off"}`;
  num.textContent = t.shared && t.slot != null ? `#${t.slot}` : "·";

  const meta = document.createElement("span");
  meta.className = "meta";
  const title = document.createElement("div");
  title.className = "title";
  title.textContent = t.title || "(untitled)"; // textContent: page titles are untrusted
  const sub = document.createElement("div");
  sub.className = "sub";
  const host = document.createElement("span");
  host.className = "host";
  host.textContent = hostOf(t.url);
  sub.append(host);
  if (t.active) {
    const dot = document.createElement("span");
    dot.className = "live-dot";
    dot.title = "Active tab";
    sub.append(dot);
  }
  meta.append(title, sub);

  const sw = document.createElement("span");
  sw.className = "sw";
  sw.setAttribute("aria-hidden", "true");

  row.append(num, meta, sw);
  row.addEventListener("click", async () => {
    const next = !(row.getAttribute("aria-pressed") === "true");
    row.setAttribute("aria-pressed", String(next)); // optimistic
    const res = (await bg(KIND.toggleShare, { tabId: t.tabId, shared: next })) as
      | { tabs: PopupTab[] }
      | undefined;
    if (res) renderTabs(res.tabs);
  });
  return row;
}

function renderTabs(tabs: PopupTab[]): void {
  list.replaceChildren();
  const shared = tabs.filter((t) => t.shared).length;
  count.textContent = tabs.length ? `${shared} of ${tabs.length} shared` : "";
  hint.hidden = !(tabs.length > 0 && shared === 0);

  if (!tabs.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No open tabs.";
    list.append(empty);
    return;
  }
  for (const t of tabs) list.append(tabRow(t));
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
  await saveSettings(port, labelInput.value);
  await chrome.runtime.sendMessage({ to: TO.bg, kind: KIND.settingsChanged });
  saved.classList.add("show");
  for (const delay of [400, 900, 1600]) setTimeout(refreshStatus, delay);
  setTimeout(() => saved.classList.remove("show"), 2000);
});

void load();
