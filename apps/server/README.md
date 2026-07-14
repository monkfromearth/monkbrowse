<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/monkfromearth/monkbrowse/main/assets/logo-wordmark-dark.svg">
    <img src="https://raw.githubusercontent.com/monkfromearth/monkbrowse/main/assets/logo-wordmark.svg" alt="monkbrowse" width="440">
  </picture>
</p>

<p align="center">
  <strong>One MCP server. Many Chrome tabs. Many Chrome profiles. All at once.</strong>
</p>

<p align="center">
  Let an AI drive the Chrome you already use — logged in, real fingerprint, no relaunch — from Claude, Cursor, VS&nbsp;Code, Windsurf, or any MCP client.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/monkbrowse"><img alt="npm" src="https://img.shields.io/npm/v/monkbrowse?color=cb3837&logo=npm"></a>
  <img alt="License: Apache 2.0" src="https://img.shields.io/badge/license-Apache--2.0-blue">
  <img alt="MCP compatible" src="https://img.shields.io/badge/MCP-compatible-6E56CF">
</p>

<p align="center">
  <a href="https://monkfromearth.github.io/monkbrowse/guide/install">Install</a> ·
  <a href="https://monkfromearth.github.io/monkbrowse/guide/use-cases">Use cases</a> ·
  <a href="https://monkfromearth.github.io/monkbrowse/guide/tools">Tools</a> ·
  <a href="https://github.com/monkfromearth/monkbrowse">GitHub</a>
</p>

---

This is the **server** half of monkbrowse. It talks to your AI over MCP (stdio) and drives your real Chrome through the **[monkbrowse Chrome extension](https://github.com/monkfromearth/monkbrowse)** over a local WebSocket. Both halves are required.

Because it is *your* Chrome, your sessions, cookies, and 2FA are already there, and it works on sites that block headless automation. What makes it different: **a single server drives many tabs across many Chrome profiles at the same time.** Each profile connects on its own port; each shared tab gets a simple number (1, 2, 3…). Tools target `{ profile, tab }`, so you can tell your AI "on tab 2, do X."

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

**You choose what the AI can see.** By default it sees *nothing*. Each tab has a **Share** toggle in the popup; only shared tabs get a number and become drivable. Your banking tab stays invisible, and a tool call against an unshared tab is refused.

## Install

Two small steps. No path juggling, no build.

### 1. Add the server to your AI app

One-click:

<a href="cursor://anysphere.cursor-deeplink/mcp/install?name=monkbrowse&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm1vbmticm93c2UiXX0="><img alt="Add to Cursor" src="https://img.shields.io/badge/Add%20to-Cursor-0b0b0b?style=for-the-badge&logo=cursor&logoColor=white" height="30"></a>
&nbsp;
<a href="vscode:mcp/install?%7B%22name%22%3A%22monkbrowse%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22monkbrowse%22%5D%7D"><img alt="Install in VS Code" src="https://img.shields.io/badge/Install%20in-VS%20Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white" height="30"></a>

Or one command:

```bash
# Claude Code
claude mcp add monkbrowse -- npx -y monkbrowse

# VS Code
code --add-mcp '{"name":"monkbrowse","command":"npx","args":["-y","monkbrowse"]}'
```

Windsurf, Claude Desktop, or any other client — same config everywhere:

```jsonc
{ "mcpServers": { "monkbrowse": { "command": "npx", "args": ["-y", "monkbrowse"] } } }
```

`bunx monkbrowse` and `pnpm dlx monkbrowse` work too. Per-client details: **[Install guide](https://monkfromearth.github.io/monkbrowse/guide/install)**.

### 2. Install the Chrome extension

monkbrowse drives your real Chrome, so it needs a small extension. Grab the latest `monkbrowse-*.zip` from [releases](https://github.com/monkfromearth/monkbrowse/releases), unzip it, then in `chrome://extensions` turn on **Developer mode** and **Load unpacked** the folder. (Chrome Web Store listing in review.)

Open the popup, toggle a tab **on** (it gets a number like `#1`), and tell the AI *"on tab 1, do X."*

## The tools

22 tools. Full arguments and behavior: **[tool reference](https://monkfromearth.github.io/monkbrowse/guide/tools)**.

| Group | Tools |
|---|---|
| **Navigation** | `browser_navigate` · `browser_go_back` · `browser_go_forward` · `browser_reload` |
| **Reading** | `browser_snapshot` · `browser_get_text` · `browser_screenshot` · `browser_get_console_logs` · `browser_evaluate` |
| **Interacting** | `browser_click` · `browser_hover` · `browser_type` · `browser_select_option` · `browser_press_key` · `browser_scroll` · `browser_drag` · `browser_upload_file` |
| **Timing** | `browser_wait` |
| **Tabs & profiles** | `browser_list_tabs` · `browser_switch_tab` · `browser_new_tab` · `browser_close_tab` |

The snapshot is **shadow-DOM and same-origin-iframe aware**; reads that time out retry automatically while actions never silently re-send; calls to different tabs run in parallel while two mutations on the *same* tab are serialized.

## CLI

```bash
monkbrowse --base-port 9222   # first profile port (default 9222)
monkbrowse --ports 20         # how many consecutive profile ports to bind
```

Your AI client normally launches this for you; you rarely run it by hand.

## Links

- **Docs:** https://monkfromearth.github.io/monkbrowse/
- **Source, issues, releases:** https://github.com/monkfromearth/monkbrowse

## License

Apache-2.0.
