import { KIND, TO } from "../../lib/constants";

interface State {
  connected: boolean;
  port: number | null;
  label: string;
}

async function bg(kind: string): Promise<unknown> {
  const res = (await chrome.runtime.sendMessage({ to: TO.bg, kind })) as
    | { ok: true; result: unknown }
    | { ok: false; error: string }
    | undefined;
  return res?.ok ? res.result : undefined;
}

async function render(): Promise<void> {
  const state = ((await bg(KIND.getState)) as State | undefined) ?? {
    connected: false,
    port: null,
    label: "",
  };
  const status = document.getElementById("status")!;
  status.replaceChildren();
  const dot = document.createElement("span");
  dot.className = `dot ${state.connected ? "on" : "off"}`;
  status.append(dot, state.connected ? "Connected" : "Disconnected");
  document.getElementById("label")!.textContent = state.label || "—";
  document.getElementById("port")!.textContent = state.port
    ? String(state.port)
    : "—";
}

document.getElementById("reconnect")!.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ to: TO.bg, kind: KIND.settingsChanged });
  setTimeout(render, 500);
});

document.getElementById("settings")!.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

void render();
