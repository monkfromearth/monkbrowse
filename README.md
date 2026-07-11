<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-wordmark-dark.svg">
    <img src="./assets/logo-wordmark.svg" alt="monkbrowse" width="440">
  </picture>
</p>

<p align="center">
  <strong>One MCP server. Many Chrome tabs. Many Chrome profiles. All at once.</strong>
</p>

<p align="center">
  Automate the Chrome you already use — logged in, real fingerprint, no relaunch — from Claude, Cursor, VS&nbsp;Code, or any MCP client.
</p>

---

## What it is

**monkbrowse** is an **MCP server + Chrome extension**. The AI talks to the server over stdio; the server drives your real browser through the extension over a local WebSocket. Because it's *your* Chrome, your sessions, cookies, and 2FA are already there — and it works on sites that block headless automation.

The thing that makes it different: **a single server drives many tabs across many Chrome profiles simultaneously.** Each profile connects on its own port; tabs are addressed by id. Tools target `{ profile, tabId }`.

```
                      ┌──── monkbrowse server (one process) ────┐
 AI app ──stdio/MCP──▶│  registry: Map<port, profile>           │
                      │  ws :9222 ─▶ extension · profile "Work"  ├─▶ tabs
                      │  ws :9223 ─▶ extension · profile "Home"  ├─▶ tabs
                      └─────────────────────────────────────────┘
```

## Why

| | Headless (Playwright/Puppeteer) | monkbrowse |
|---|---|---|
| Login / cookies / 2FA | re-auth every run | **already logged in** |
| Bot / CAPTCHA walls | frequently blocked | **real fingerprint** |
| Profiles | one clean context | **many real profiles at once** |
| Where it runs | a spawned browser | **the Chrome on your screen** |
| Privacy | — | **100% local** |

The trade-off: it drives a browser you can see, one action at a time per tab (like a fast human), not a headless farm. That's the point.

## How it works

- The server exposes browser **tools** to the AI and binds **one WebSocket listener per profile port** (default range `9222`–`9241`).
- Each Chrome profile runs the extension, configured (in its options) to connect to **one** port with a friendly **label**. A port identifies a profile.
- A **connection registry** holds every profile at once — a second profile never evicts the first (the flaw in single-socket designs).
- Inside the extension, an **offscreen document owns the socket** so it survives service-worker suspension; the service worker executes Chrome APIs; a content script builds the accessibility snapshot and runs DOM actions.
- Most actions return a fresh **accessibility snapshot** of the tab, so the AI "sees" the result without a screenshot.

Full detail: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** · wire protocol: **[docs/PROTOCOL.md](docs/PROTOCOL.md)**.

## Install

**1. The server** — point your MCP client at it:

```jsonc
{
  "mcpServers": {
    "monkbrowse": { "command": "npx", "args": ["monkbrowse"] }
  }
}
```

Or run the local build directly: `node apps/server/dist/index.js`.

**2. The extension** — `chrome://extensions` → **Developer mode** → **Load unpacked** → `apps/extension/.output/chrome-mv3`. Open its **options**, set this profile's **port** (e.g. `9222`) and a **label**, then Connect. The toolbar badge turns **on** when connected.

**3. Add more profiles** — load the extension in another Chrome profile and give it a *different* port (`9223`, …). The one server sees them all.

More detail, including the multi-profile walkthrough: **[docs/GETTING-STARTED.md](docs/GETTING-STARTED.md)**.

## Using it

Address a profile by its port (or label/id), a tab by its id — or omit both to use the focused profile's active tab.

```
browser_list_tabs                                   → every tab across every profile (ids like "9223:5417")
browser_navigate  { profile: 9223, url: "…" }       → drive the "Home" profile
browser_snapshot  { profile: 9222, tabId: 5417 }    → read a specific tab
browser_click     { ref: "e12", element: "Sign in" }→ focused profile, active tab
```

Full tool reference: **[docs/TOOLS.md](docs/TOOLS.md)**.

## Repo layout

```
apps/server        MCP server (stdio ↔ AI, one WebSocket per profile port)
apps/extension     MV3 Chrome extension (WXT) — one instance per Chrome profile
packages/protocol  zod: AI tool schemas + server↔extension wire messages
packages/messaging transport-agnostic request/response peer
packages/config    port range, names
packages/utils     shared helpers
assets/            brand: logo, wordmark, lockup, icon
```

## Develop

```bash
bun install
bun run typecheck          # turbo, all packages + apps
bun run test               # bun test — unit + server integration (no browser needed)
bun run build              # server → apps/server/dist ; extension → apps/extension/.output/chrome-mv3
bun run dev:server         # bun --watch on the server
bun run dev:extension      # wxt dev
bun run package:extension  # wxt zip for the Chrome Web Store
```

Adding a browser tool spans four files (schema → wire message → server handler → extension executor) — see **[.claude/rules/mcp-tools.md](.claude/rules/mcp-tools.md)**.

## Status

Server and extension build and typecheck; the server path (registry, handshake, addressing, concurrency) is verified end-to-end against simulated profiles. Real-Chrome hardening (service-worker survival, injection edge cases, snapshot tuning on complex pages) is in progress.

## Credits

Turborepo + Bun + TypeScript. The real-browser approach is adapted from the [Playwright MCP server](https://github.com/microsoft/playwright-mcp) and the original [Browser MCP](https://browsermcp.io); the multi-profile architecture, extension, and brand here are built fresh.
