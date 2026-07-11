# Getting started

Get monkbrowse driving your real Chrome — one profile first, then many.

## Prerequisites

- **Bun** ≥ 1.2 (`curl -fsSL https://bun.sh/install | bash`)
- **Chrome** (or any Chromium browser with MV3 + offscreen support)
- An MCP client: Claude, Cursor, VS Code (agent mode), Windsurf, or the MCP Inspector

## 1. Build

```bash
bun install
bun run build
```

This produces:
- **Server:** `apps/server/dist/index.js` (a Node-compatible bin, command `monkbrowse`)
- **Extension:** `apps/extension/.output/chrome-mv3/` (unpacked, ready to load)

## 2. Add the server to your MCP client

```jsonc
{
  "mcpServers": {
    "monkbrowse": {
      "command": "node",
      "args": ["/absolute/path/to/apps/server/dist/index.js"]
    }
  }
}
```

Once published to npm you can use `{ "command": "npx", "args": ["monkbrowse"] }` instead.

Options (rarely needed): `--base-port <n>` (default `9222`) and `--ports <count>` (default `20`) set the profile port range.

## 3. Load the extension in your first profile

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. **Load unpacked** → select `apps/extension/.output/chrome-mv3`.
4. The **monkbrowse** icon appears in the toolbar. Click it → **Settings**.
5. Set a **Port** (e.g. `9222`) and a **Label** (e.g. `Work`). Save.
6. The toolbar badge shows **on** when the extension is connected to the server.

Now ask your AI to run `browser_list_tabs` — it should list that profile's tabs.

## 4. Add more profiles

Chrome runs each profile as its own world, so the extension is loaded per profile:

1. Switch to another Chrome profile (or create one).
2. Load the **same** unpacked extension there (`chrome://extensions` → Load unpacked).
3. Open its Settings and give it a **different port** (e.g. `9223`) and label (e.g. `Personal`).

The single server now sees both. `browser_list_tabs` aggregates every profile, with composite ids like `9223:5417` (`<port>:<tabId>`). Address a profile by port, by its label's id, or omit `profile` to use the focused one.

> Two profiles must not share a port. If they do, the second to connect is rejected with a message telling you to change its port — the first is never kicked off.

## 5. Verify it works

Ask the AI (or use the MCP Inspector: `bun run --cwd apps/server inspector`):

- `browser_list_tabs` → tabs from every connected profile
- `browser_navigate { profile: 9222, url: "https://example.com" }` → drives that profile
- `browser_snapshot { profile: 9223 }` → reads the other profile's active tab

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "No browser profile is connected" | The extension isn't connected. Open its popup — badge should say **on**; if not, click **Reconnect** or check the port matches the server range. |
| "Port 9222 is already in use by profile …" | Two profiles picked the same port. Change one in its Settings. |
| Tool hangs then times out | The target tab is a `chrome://` / Web Store page (Chrome blocks scripting there), or the service worker was asleep — retry; it reconnects. |
| Badge flips on/off | Normal MV3 service-worker cycling; the offscreen socket + alarm reconnect keep it alive. Persistent flapping → check the server is running on that port. |
| Snapshot looks sparse | The accessibility walker surfaces interactive/structural elements; very custom widgets may under-report. Capture a fresh snapshot before acting on a `ref`. |

## What's where

- Architecture & request lifecycle → [ARCHITECTURE.md](ARCHITECTURE.md)
- Wire protocol & message catalog → [PROTOCOL.md](PROTOCOL.md)
- Every tool and its arguments → [TOOLS.md](TOOLS.md)
