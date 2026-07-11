import { listPorts, mcpConfig } from "@monkbrowse/config/mcp.config";

import { KIND, TO } from "../../lib/constants";
import { getIdentity, saveSettings } from "../../lib/identity";

const portInput = document.getElementById("port") as HTMLInputElement;
const labelInput = document.getElementById("label") as HTMLInputElement;
const dot = document.getElementById("dot")!;
const statusText = document.getElementById("statusText")!;
const saved = document.getElementById("saved")!;

const ports = listPorts();
document.getElementById("range")!.textContent =
  `Server range ${ports[0]}–${ports[ports.length - 1]}. One port per profile.`;

async function bg(kind: string): Promise<unknown> {
  const res = (await chrome.runtime.sendMessage({ to: TO.bg, kind })) as
    | { ok: true; result: unknown }
    | { ok: false; error: string }
    | undefined;
  return res?.ok ? res.result : undefined;
}

function paintStatus(connected: boolean): void {
  dot.className = `dot ${connected ? "on" : "off"}`;
  statusText.textContent = connected ? "Connected" : "Disconnected";
}

async function refreshStatus(): Promise<void> {
  const state = (await bg(KIND.getState)) as { connected: boolean } | undefined;
  paintStatus(Boolean(state?.connected));
}

async function load(): Promise<void> {
  const { port, label } = await getIdentity();
  portInput.value = String(port);
  labelInput.value = label;
  await refreshStatus();
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
  // Poll for the reconnect to land.
  for (const delay of [400, 900, 1600]) {
    setTimeout(refreshStatus, delay);
  }
  setTimeout(() => saved.classList.remove("show"), 2000);
});

void load();
