<h3 align="center">Monkbrowse</h3>

<p align="center">
  Automate your real Chrome with AI — across many tabs and many profiles, from one MCP server.
</p>

## About

Monkbrowse is an **MCP server + Chrome extension** that lets AI apps (Claude, Cursor, VS Code, Windsurf) drive the Chrome you already use — logged in, real fingerprint, no relaunch. This is **v2**: a turborepo + Bun + TypeScript monorepo where a **single server drives multiple tabs across multiple Chrome profiles at once**, each profile on its own port.

## Why v2

The original was server-only and held a single WebSocket — a second tab or profile evicted the first. v2 replaces that with a connection **registry**: one server, one WebSocket listener per profile port, tabs addressed by id. Tools target `{ profile, tabId }`.

- ⚡ **Fast & local** — no network round-trips, no headless browser.
- 🔒 **Private** — your browsing stays on your device.
- 👤 **Logged in** — uses your existing profiles and sessions.
- 🧭 **Multi-profile** — Work, Personal, QA… all connected simultaneously, one MCP server.

## Structure

```
apps/server        MCP server (stdio ↔ AI, one WebSocket per profile port)
apps/extension     MV3 Chrome extension (WXT) — one instance per Chrome profile
packages/protocol  zod: AI tool schemas + server↔extension wire messages
packages/messaging transport-agnostic request/response peer
packages/config    port range, names
packages/utils     shared helpers
```

## Develop

```bash
bun install
bun run typecheck
bun run build              # server → apps/server/dist ; extension → apps/extension/.output/chrome-mv3
bun run dev:server
bun run dev:extension
```

Load the extension: `chrome://extensions` → Developer mode → Load unpacked → `apps/extension/.output/chrome-mv3`. Open its options to set this profile's **port** (e.g. 9222) and **label**, then Connect. Repeat in another profile with a different port. Point your MCP client at `apps/server/dist/index.js` (or `npx monkbrowse`).

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how it all fits, the request lifecycle, the registry, MV3 survival.
- [docs/PROTOCOL.md](docs/PROTOCOL.md) — the messaging envelope + message catalog.

## Credits

Adapted from the [Playwright MCP server](https://github.com/microsoft/playwright-mcp) approach and the original [Browser MCP](https://browsermcp.io); the multi-profile architecture and extension are rebuilt here.
