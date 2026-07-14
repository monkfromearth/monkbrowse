# Getting started

Get monkbrowse driving your real Chrome — one profile first, then many.

## Prerequisites

- **Node** (for `npx`) — or Bun / pnpm if you prefer `bunx` / `pnpm dlx`
- **Chrome** (or any Chromium browser with MV3 + offscreen support)
- An MCP client: Claude, Cursor, VS Code (agent mode), Windsurf, or the MCP Inspector

## 1. Add the server to your MCP client

The server is on npm, so your client just runs it — nothing to download or build:

```jsonc
{
  "mcpServers": {
    "monkbrowse": { "command": "npx", "args": ["-y", "monkbrowse"] }
  }
}
```

One-click buttons and the exact spot each client keeps this are on the **[Install page](https://monkfromearth.github.io/monkbrowse/guide/install)**. Options (rarely needed): `--base-port <n>` (default `9222`) and `--ports <count>` (default `20`) set the profile port range.

## 2. Install the extension in your first profile

Install monkbrowse from the **[Chrome Web Store](https://chromewebstore.google.com/detail/monkbrowse/ilkfoegakbcdibloiddkcbnpgjkgjgmd)** (one click, auto-updates). Then:

1. Click the **monkbrowse** toolbar icon — the popup opens.
2. Set a **Port** (e.g. `9222`) and a **Label** (e.g. `Work`), then **Connect**.
3. The status reads **Connected** once it reaches a running server.

> Each Chrome profile is its own world, so install the extension in each profile you want the AI to reach.

> **A server must be running for it to connect.** The extension alone connects
> to nothing. Your MCP client starts the server when it launches — but to check
> the connection on its own, run the doctor (next).

## Quick check — is the extension connecting?

If you cloned the repo, run the doctor — a bare server that just prints who connects (skip this if you installed via npx):

```bash
bun run doctor
```

Load the extension (or click Connect), and you should see:

```
  [time] connected profiles:
      ✓ Work  ·  port 9222  ·  12 tabs
```

If you see that, the browser half works — any remaining issue is on the MCP
side (server not launched by your client, or a tool call). If you *don't*, open
the extension's **offscreen** console (Step "Troubleshooting" below) to see why.
Stop the doctor with Ctrl-C before starting your MCP client (one server per port).

Then, with your MCP client running, ask your AI to run `browser_list_tabs`.

## Share the tabs the AI may use

By default the AI sees **nothing**. In the popup, each tab has a **Share** toggle — flip on the tabs you want the AI to control. Only shared tabs get a number (1, 2, 3…) and appear in `browser_list_tabs`; the rest stay private. Unshared tabs (banking, email, whatever) are invisible to the AI, and a tool call against one is refused.

So the flow is: **share a tab → it gets a number → tell your AI "on tab 2, …".**

## 4. Add more profiles

Chrome runs each profile as its own world, so the extension is loaded per profile:

1. Switch to another Chrome profile (or create one).
2. Load the **same** unpacked extension there (`chrome://extensions` → Load unpacked).
3. Open its Settings and give it a **different port** (e.g. `9223`) and label (e.g. `Personal`).

The single server now sees both. `browser_list_tabs` aggregates every profile, with each tab shown as a **simple number** (1, 2, 3…) — the same number in that profile's popup. Address a tab as `{ profile, tab }`; address a profile by port or label, or omit `profile` to use the focused one.

> Two profiles must not share a port. If they do, the second to connect is rejected with a message telling you to change its port — the first is never kicked off.

## 5. Verify it works

Ask the AI (or use the MCP Inspector: `bun run --cwd apps/server inspector`):

- `browser_list_tabs` → tabs from every connected profile
- `browser_navigate { profile: 9222, url: "https://example.com" }` → drives that profile
- `browser_snapshot { profile: 9223 }` → reads the other profile's active tab

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "No browser profile is connected" | The extension isn't connected. Open its popup — the status dot should be green **Connected**; if not, check your MCP client is running or that the port matches the server range. |
| "Port 9222 is already in use by profile …" | Two profiles picked the same port. Change one in its Settings. |
| Tool hangs then times out | The target tab is a `chrome://` / Web Store page (Chrome blocks scripting there), or the service worker was asleep — retry; it reconnects. |
| Badge flips on/off | Normal MV3 service-worker cycling; the offscreen socket + alarm reconnect keep it alive. Persistent flapping → check the server is running on that port. |
| Snapshot looks sparse | The accessibility walker surfaces interactive/structural elements; very custom widgets may under-report. Capture a fresh snapshot before acting on a `ref`. |

## What's where

- Architecture & request lifecycle → [ARCHITECTURE.md](ARCHITECTURE.md)
- Wire protocol & message catalog → [PROTOCOL.md](PROTOCOL.md)
- Every tool and its arguments → [TOOLS.md](TOOLS.md)
