import { listPorts, mcpConfig } from "@monkbrowse/config/mcp.config";

import { KIND, TO } from "../../lib/constants";
import { getIdentity, saveSettings } from "../../lib/identity";

const portInput = document.getElementById("port") as HTMLInputElement;
const labelInput = document.getElementById("label") as HTMLInputElement;
const saved = document.getElementById("saved")!;

const ports = listPorts();
document.getElementById("range")!.textContent =
  `Server range: ${ports[0]}–${ports[ports.length - 1]} (${mcpConfig.portCount} profiles).`;

async function load(): Promise<void> {
  const { port, label } = await getIdentity();
  portInput.value = String(port);
  labelInput.value = label;
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
  setTimeout(() => saved.classList.remove("show"), 1500);
});

void load();
