import { KIND, TO } from "../../lib/constants";
import { getIdentity, saveSettings } from "../../lib/identity";
import type { PopupTab } from "../../lib/tabs";

const portInput = document.getElementById("port") as HTMLInputElement;
const labelInput = document.getElementById("label") as HTMLInputElement;
const stat = document.getElementById("stat")!;
const statText = document.getElementById("statText")!;
const bar = document.getElementById("bar")!;
const search = document.getElementById("search") as HTMLInputElement;
const shareAllBtn = document.getElementById("shareAll") as HTMLButtonElement;
const list = document.getElementById("list")!;
const count = document.getElementById("count")!;
const hint = document.getElementById("hint")!;
const saved = document.getElementById("saved")!;
const connSummary = document.getElementById("connSummary")!;

let allTabs: PopupTab[] = [];

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

const GLOBE =
  '<svg class="fav blank" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M3 12h18M12 3c2.5 2.4 2.5 15.6 0 18M12 3c-2.5 2.4-2.5 15.6 0 18" stroke="currentColor" stroke-width="1.6"/></svg>';

/** A tab's own favicon is reliable when loaded; fall back to a neutral globe. */
function faviconEl(t: PopupTab): Element {
  const u = t.favIconUrl;
  if (u && /^(https?:|data:)/.test(u)) {
    const img = document.createElement("img");
    img.className = "fav";
    img.alt = "";
    img.src = u;
    img.addEventListener("error", () => {
      const g = document.createElement("template");
      g.innerHTML = GLOBE;
      img.replaceWith(g.content.firstChild!);
    });
    return img;
  }
  const g = document.createElement("template");
  g.innerHTML = GLOBE;
  return g.content.firstChild as Element;
}

function tabRow(t: PopupTab): HTMLDivElement {
  const row = document.createElement("div");
  row.className = `row${t.active ? " active" : ""}`;
  row.setAttribute("role", "button");
  row.tabIndex = 0;
  row.setAttribute("aria-pressed", String(t.shared));
  row.setAttribute(
    "aria-label",
    `${t.shared ? "Shared" : "Not shared"}: ${t.title || hostOf(t.url)}`,
  );

  const meta = document.createElement("span");
  meta.className = "meta";
  const title = document.createElement("div");
  title.className = "title";
  title.textContent = t.title || "(untitled)"; // textContent: page titles are untrusted
  title.title = t.title || ""; // full title on hover
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

  const end = document.createElement("span");
  end.className = "end";
  if (t.shared && t.slot != null) {
    const num = document.createElement("span");
    num.className = "num";
    num.textContent = `#${t.slot}`;
    end.append(num);
  }
  const go = document.createElement("button");
  go.className = "go";
  go.type = "button";
  go.title = "Go to this tab";
  go.setAttribute("aria-label", "Go to this tab");
  go.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3h7v7M13 3L4 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  go.addEventListener("click", async (e) => {
    e.stopPropagation();
    await bg(KIND.activateTab, { tabId: t.tabId });
    window.close();
  });
  const sw = document.createElement("span");
  sw.className = "sw";
  sw.setAttribute("aria-hidden", "true");
  end.append(go, sw);

  row.append(faviconEl(t), meta, end);

  const toggle = async (): Promise<void> => {
    const next = row.getAttribute("aria-pressed") !== "true";
    const res = (await bg(KIND.toggleShare, { tabId: t.tabId, shared: next })) as
      | { tabs: PopupTab[] }
      | undefined;
    if (res) setTabs(res.tabs);
  };
  row.addEventListener("click", () => void toggle());
  row.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      void toggle();
    }
  });
  return row;
}

function groupHeader(text: string): HTMLDivElement {
  const h = document.createElement("div");
  h.className = "group";
  h.textContent = text;
  return h;
}

function render(): void {
  const term = search.value.trim().toLowerCase();
  const shared = allTabs.filter((t) => t.shared).length;
  count.textContent = allTabs.length
    ? `${shared} of ${allTabs.length} shared`
    : "";
  bar.hidden = allTabs.length === 0;
  hint.hidden = !(allTabs.length > 0 && shared === 0 && !term);
  shareAllBtn.textContent = shared < allTabs.length ? "Share all" : "Clear";

  const shown = term
    ? allTabs.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          hostOf(t.url).toLowerCase().includes(term),
      )
    : allTabs;

  list.replaceChildren();
  if (!allTabs.length) {
    const empty = document.createElement("div");
    empty.className = "noresult";
    empty.textContent = "No open tabs.";
    list.append(empty);
    return;
  }
  if (!shown.length) {
    const none = document.createElement("div");
    none.className = "noresult";
    none.textContent = "No tabs match your search.";
    list.append(none);
    return;
  }

  // Shared tabs float to the top (in slot order) so the AI's set is always
  // visible at a glance; everything else follows in tab order.
  const sharedTabs = shown
    .filter((t) => t.shared)
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
  const otherTabs = shown.filter((t) => !t.shared);
  const headers = sharedTabs.length > 0 && otherTabs.length > 0;

  if (headers && sharedTabs.length) list.append(groupHeader("Shared"));
  for (const t of sharedTabs) list.append(tabRow(t));
  if (headers && otherTabs.length) list.append(groupHeader("Other tabs"));
  for (const t of otherTabs) list.append(tabRow(t));
}

function setTabs(tabs: PopupTab[]): void {
  allTabs = tabs;
  render();
}

async function loadTabs(): Promise<void> {
  const res = (await bg(KIND.listTabs)) as { tabs: PopupTab[] } | undefined;
  setTabs(res?.tabs ?? []);
}

// --- keyboard: search-first, arrow through rows, Esc clears or closes ---
function rowEls(): HTMLElement[] {
  return [...list.querySelectorAll<HTMLElement>(".row")];
}

search.addEventListener("input", render);
search.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    rowEls()[0]?.focus();
  } else if (e.key === "Escape") {
    if (search.value) {
      search.value = "";
      render();
    } else {
      window.close();
    }
  }
});

list.addEventListener("keydown", (e) => {
  const rows = rowEls();
  const i = rows.indexOf(document.activeElement as HTMLElement);
  if (e.key === "ArrowDown") {
    e.preventDefault();
    rows[Math.min(rows.length - 1, i + 1)]?.focus();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (i <= 0) search.focus();
    else rows[i - 1]?.focus();
  } else if (e.key === "Escape") {
    e.preventDefault();
    search.focus();
  } else if (
    e.key.length === 1 &&
    e.key !== " " &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey
  ) {
    // Start typing anywhere in the list to jump to the search box.
    search.value += e.key;
    search.focus();
    render();
    e.preventDefault();
  }
});

shareAllBtn.addEventListener("click", async () => {
  const shareAll = allTabs.filter((t) => t.shared).length < allTabs.length;
  const res = (await bg(KIND.shareAll, { shared: shareAll })) as
    | { tabs: PopupTab[] }
    | undefined;
  if (res) setTabs(res.tabs);
});

async function load(): Promise<void> {
  const { port, label } = await getIdentity();
  portInput.value = String(port);
  labelInput.value = label;
  await Promise.all([refreshStatus(), loadTabs()]);
  search.focus(); // land in the search box so you can filter immediately
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
