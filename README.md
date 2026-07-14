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
  Let an AI drive the Chrome you already use, logged in, real fingerprint, no relaunch, from Claude, Cursor, VS&nbsp;Code, Windsurf, or any MCP client.
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License: Apache 2.0" src="https://img.shields.io/badge/license-Apache--2.0-blue"></a>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6">
  <img alt="Bun" src="https://img.shields.io/badge/Bun-1.3-black">
  <img alt="MCP compatible" src="https://img.shields.io/badge/MCP-compatible-6E56CF">
  <img alt="Status: pre-release" src="https://img.shields.io/badge/status-pre--release-orange">
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#quickstart">Quickstart</a> ·
  <a href="#extending-monkbrowse">Extend</a> ·
  <a href="#the-tools">Tools</a> ·
  <a href="./docs/GETTING-STARTED.md">Getting started</a> ·
  <a href="./docs/ARCHITECTURE.md">Architecture</a>
</p>

---

> **Status: pre-release, private repo, not on npm yet.** You build it locally and load the extension unpacked. Everything below reflects the current local-build flow. Anything that only works "once published" is labelled as such.

## What it is

**monkbrowse** is an **MCP server plus a Chrome extension**. The AI talks to the server over stdio; the server drives your real browser through the extension over a local WebSocket. Because it is *your* Chrome, your sessions, cookies, and 2FA are already there, and it works on sites that block headless automation.

What makes it different: **a single server drives many tabs across many Chrome profiles at the same time.** Each profile connects on its own port; each shared tab gets a simple number (1, 2, 3…) shown in the popup. Tools target `{ profile, tab }`, so you can literally tell your AI "on tab 2, do X."

```
                      ┌──── monkbrowse server (one process) ────┐
 AI app ──stdio/MCP──▶│  registry: Map<port, profile>           │
                      │  ws :9222 ─▶ extension · profile "Work"  ├─▶ tabs
                      │  ws :9223 ─▶ extension · profile "Home"  ├─▶ tabs
                      └─────────────────────────────────────────┘
```

## Why a real browser, not headless

| | Headless (Playwright / Puppeteer) | monkbrowse |
|---|---|---|
| Login / cookies / 2FA | re-auth every run | **already logged in** |
| Bot / CAPTCHA walls | frequently blocked | **real fingerprint** |
| Profiles | one clean context | **many real profiles at once** |
| Where it runs | a spawned browser | **the Chrome on your screen** |
| Privacy | varies | **100% local** |

The trade-off: it drives a browser you can see, one action at a time per tab (like a fast human), not a headless farm. That is the point.

**You choose what the AI can see.** By default it sees *nothing*. Each tab has a **Share** toggle in the popup; only shared tabs get a number and become drivable. Your banking tab stays invisible, and a tool call against an unshared tab is refused.

## Install

Two halves, both required: the **server** (your AI app launches it) and the **extension** (loaded in each Chrome profile).

### Step 1: Build

```bash
bun install
bun run build
```

This produces:

- **Server:** `apps/server/dist/index.js` (a Node-compatible bin named `monkbrowse`)
- **Extension:** `apps/extension/dist/chrome-mv3/` (unpacked, ready to load)

### Step 2: Point your AI app at the server

Every MCP client uses the same server config. Replace the path with your absolute path to `apps/server/dist/index.js` (run `echo "$(pwd)/apps/server/dist/index.js"` from the repo root to get it):

```jsonc
{
  "command": "bun",
  "args": ["/ABSOLUTE/PATH/TO/browsermcp/apps/server/dist/index.js"]
}
```

Where that snippet goes differs per app. Pick yours below.

<details open>
<summary><strong>Claude Code</strong></summary>

One command from anywhere (user scope, replace the path):

```bash
claude mcp add monkbrowse --scope user -- bun /ABSOLUTE/PATH/TO/browsermcp/apps/server/dist/index.js
```

Or add it by hand to a project's `.mcp.json` (or `~/.claude.json` for user scope):

```jsonc
{
  "mcpServers": {
    "monkbrowse": {
      "command": "bun",
      "args": ["/ABSOLUTE/PATH/TO/browsermcp/apps/server/dist/index.js"]
    }
  }
}
```

Verify with `claude mcp list`.
</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Edit the config file (create it if missing), then restart Claude Desktop:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```jsonc
{
  "mcpServers": {
    "monkbrowse": {
      "command": "bun",
      "args": ["/ABSOLUTE/PATH/TO/browsermcp/apps/server/dist/index.js"]
    }
  }
}
```

You can also open **Settings → Developer → Edit Config** to reach the same file.
</details>

<details>
<summary><strong>Cursor</strong></summary>

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` in a project:

```jsonc
{
  "mcpServers": {
    "monkbrowse": {
      "command": "bun",
      "args": ["/ABSOLUTE/PATH/TO/browsermcp/apps/server/dist/index.js"]
    }
  }
}
```

Then enable it under **Settings → MCP**. (A one-click `cursor://` deeplink is listed under [Once published](#once-published).)
</details>

<details>
<summary><strong>VS Code (Copilot agent mode)</strong></summary>

VS Code's native MCP support uses a `servers` key (note: not `mcpServers`) and a `type`. Add `.vscode/mcp.json` in your workspace:

```jsonc
{
  "servers": {
    "monkbrowse": {
      "type": "stdio",
      "command": "bun",
      "args": ["/ABSOLUTE/PATH/TO/browsermcp/apps/server/dist/index.js"]
    }
  }
}
```

Or run **MCP: Add Server** from the Command Palette and choose "stdio". For user-level config it lives under the `"mcp": { "servers": { … } }` key in `settings.json`.

**Continue extension** instead? Continue uses `mcpServers` in `~/.continue/config.yaml` (or `config.json`) with the same `command` / `args`.
</details>

<details>
<summary><strong>Windsurf</strong></summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

```jsonc
{
  "mcpServers": {
    "monkbrowse": {
      "command": "bun",
      "args": ["/ABSOLUTE/PATH/TO/browsermcp/apps/server/dist/index.js"]
    }
  }
}
```

Or use **Windsurf Settings → Cascade → MCP Servers → Add**. Restart Cascade after saving.
</details>

### Step 3: Load the extension in each Chrome profile

Chrome isolates every profile, so the extension is loaded per profile.

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. **Load unpacked** and select `apps/extension/dist/chrome-mv3`.
4. Click the **monkbrowse** toolbar icon to open the popup.
5. Set a **Port** (e.g. `9222`) and a **Label** (e.g. `Work`), then **Connect**.

For a second profile, load the same unpacked build there and give it a **different port** (`9223`, …). The one server sees them all; a second profile never evicts the first.

> Full walkthrough, including multi-profile: **[docs/GETTING-STARTED.md](docs/GETTING-STARTED.md)**.

### Once published

When monkbrowse lands on npm, the server config collapses to a one-liner (no path, no build):

```jsonc
{ "command": "npx", "args": ["monkbrowse"] }
```

And Cursor gets a one-click deeplink:

```
cursor://anysphere.cursor-deeplink/mcp/install?name=monkbrowse&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJtb25rYnJvd3NlIl19
```

These are **not** live yet: the repo is private and unpublished. Use the local `bun` config above for now.

## Quickstart

After the build and both halves are installed:

1. **Share a tab.** Open the monkbrowse popup and flip the **Share** toggle on a tab. It gets a number (1, 2, 3…). Nothing is visible to the AI until you do this.
2. **Prove the round-trip.** Run the doctor with `--probe`, a bare server that reports which profiles connect and reads the shared tab back:

   ```bash
   bun run doctor --probe
   ```

   You should see the connected profile, its port, and its tab count. Stop it with Ctrl-C before your AI app starts its own server (one server per port).
3. **Ask your AI.** With your MCP client running:

   > "On tab 1, take a snapshot."

   The AI calls `browser_snapshot`, gets the accessibility tree back, and can act on it. Try "on tab 1, click Sign in" or "navigate tab 2 to news.ycombinator.com."

## How it works

- The server exposes browser **tools** to the AI and binds **one WebSocket listener per profile port** (default range `9222`–`9241`).
- Each Chrome profile runs the extension, set (in the popup) to connect to **one** port with a friendly **label**. A port identifies a profile.
- A **connection registry** holds every profile at once, so a second profile never evicts the first (the flaw in single-socket designs).
- Inside the extension, an **offscreen document owns the socket** so it survives service-worker suspension; the service worker executes Chrome APIs; a content script builds the accessibility snapshot and runs DOM actions.
- Most actions return a fresh **accessibility snapshot** of the tab, so the AI "sees" the result without needing a screenshot.

Full detail: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** · wire protocol: **[docs/PROTOCOL.md](docs/PROTOCOL.md)**.

## Extending monkbrowse

monkbrowse is **protocol-driven**: every tool's name, description, and argument schema live in one place (`packages/protocol`), and both the server and the extension import the *same* schemas. Add a tool there and it appears to the AI, routes through the server, and executes in the browser, with the type checker catching any mismatch across the boundary.

Adding a browser tool spans **four touch points**:

| # | Where | What you add |
|---|---|---|
| 1 | `packages/protocol/src/tools.ts` | The AI-facing `ToolDef` (name, description, zod args). Add it to `ALL_TOOLS`. Include `...target` for tab-scoped tools. |
| 2 | `packages/protocol/src/messages.ts` | The wire message: request payload (with `tabId?`) + response (echoes `tabId`). Skip for server-only tools. |
| 3 | `apps/server/src/tools/index.ts` | The handler in `toolHandlers`. Use `onTab(...)` to resolve profile + tab, `registry.send(...)`, and append a snapshot if it mutates the page. |
| 4 | `apps/extension/lib/executor.ts` | The executor branch in `execWire`. Tabs/navigation run in the service worker; DOM ops delegate to the content script. |

Then `bun run typecheck` (the shared schema fails to compile on a mismatch) and exercise it. Server-only tools (like `browser_wait`) skip steps 2 and 4.

Guides: **[.claude/rules/mcp-tools.md](.claude/rules/mcp-tools.md)** and the `add-mcp-tool` skill. There is also a **`browser_evaluate`** escape hatch (run any JS expression in the page) if you need something before writing a first-class tool.

## The tools

22 tools today. Full arguments and behavior: **[docs/TOOLS.md](docs/TOOLS.md)**.

| Group | Tools |
|---|---|
| **Navigation** | `browser_navigate` · `browser_go_back` · `browser_go_forward` · `browser_reload` |
| **Reading** | `browser_snapshot` · `browser_get_text` · `browser_screenshot` · `browser_get_console_logs` · `browser_evaluate` |
| **Interacting** | `browser_click` · `browser_hover` · `browser_type` · `browser_select_option` · `browser_press_key` · `browser_scroll` · `browser_drag` · `browser_upload_file` |
| **Timing** | `browser_wait` |
| **Tabs & profiles** | `browser_list_tabs` · `browser_switch_tab` · `browser_new_tab` · `browser_close_tab` |

Highlights: the snapshot is **shadow-DOM and same-origin-iframe aware**; reads that time out retry automatically while actions never silently re-send; calls to different tabs run in parallel while two mutations on the *same* tab are serialized.

## Repo layout

```
apps/server        MCP server (stdio ↔ AI, one WebSocket per profile port)
apps/extension     MV3 Chrome extension (WXT), one instance per Chrome profile
packages/protocol  zod: AI tool schemas + server↔extension wire messages
packages/messaging transport-agnostic request/response peer
packages/config    port range, names
packages/utils     shared helpers
assets/            brand: logo, wordmark, lockup, icon
```

## Develop

```bash
bun install
bun run typecheck          # turbo, all packages + apps (also the isomorphism guard)
bun run test               # bun test, unit + server integration (no browser needed)
bun run build              # server → apps/server/dist ; extension → apps/extension/dist/chrome-mv3
bun run doctor             # bare server that prints which Chrome profiles connect
bun run dev:server         # bun --watch on the server
bun run dev:extension      # wxt dev
bun run package:extension  # wxt zip
```

Two hard rules for this repo: the **server stays Node-compatible** (no `Bun.*` in `apps/server`), and **`packages/protocol` + `packages/messaging` stay isomorphic** (no `node`/`chrome`/`DOM` globals, so they bundle into both the Node server and the MV3 service worker). See **[.claude/rules/monorepo.md](.claude/rules/monorepo.md)**.

## Status

Server and extension build, typecheck, and pass ~96 tests, including a headless-DOM harness that exercises the real DOM engine (shadow DOM, iframes, actions), a fake-`chrome` layer that drives the real executor, and a full loop (MCP tool → server → messaging → executor → real DOM) with no browser involved. **Real-Chrome verification (service-worker survival, cross-origin iframes, snapshot tuning on complex pages) is the remaining step** before a public release.

## Credits

Turborepo + Bun + TypeScript. The real-browser approach is adapted from the [Playwright MCP server](https://github.com/microsoft/playwright-mcp) and the original [Browser MCP](https://browsermcp.io); the multi-profile architecture, extension, and brand here are built fresh.

## License

Apache 2.0. See [LICENSE](./LICENSE).
