# Monkbrowse — monorepo (v2)

MCP server + Chrome extension that let an AI app (Claude, Cursor, VS Code, Windsurf) drive **your real Chrome** — across **many tabs and many Chrome profiles at once**, from a single server. Automation runs locally and reuses your logged-in sessions (cookies, 2FA, real fingerprint).

This is a **turborepo + Bun + TypeScript monorepo** containing both halves plus the shared protocol. Unlike v1 (a server-only extraction that couldn't build), everything here builds and runs together.

## The core idea

One MCP server. Each Chrome **profile** runs the extension and connects on its **own port** (9222, 9223, …). Tabs within a profile are addressed by **tab id**. So a tool target is `{ profile, tabId }` — `profile` = a port (or profileId), `tabId` = a tab. The server holds a **registry of connections**, so a second profile never evicts the first (the fatal flaw of v1 and every single-socket clone).

```
                      ┌──── MCP server (one process) ────┐
 AI app ──stdio/MCP──▶│  registry: Map<port, profile>    │
                      │  WSS :9222 ─▶ extension (Work)    ├─▶ tabs
                      │  WSS :9223 ─▶ extension (Personal)├─▶ tabs
                      └──────────────────────────────────┘
```

## Start here

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — how the pieces fit, the request lifecycle, the registry, MV3 survival. Read first.
- **[docs/PROTOCOL.md](docs/PROTOCOL.md)** — the messaging envelope, the wire message catalog, and the internal SW↔offscreen bridge.

@.claude/rules/coding-standards.md
@.claude/rules/mcp-tools.md
@.claude/rules/monorepo.md

## Layout

```
apps/
  server/      # MCP server: stdio ↔ AI, one WebSocket listener per profile port
  extension/   # MV3 (WXT): offscreen doc owns the socket, SW executes Chrome APIs
packages/
  protocol/    # zod: AI-facing tool schemas + the server↔extension wire messages
  messaging/   # transport-agnostic request/response Peer (no ws, no chrome, no node)
  config/      # port range, names, error strings
  utils/       # wait, backoff, composite-id helpers
turbo.json · package.json (bun workspaces + catalog) · tsconfig.base.json
```

## Commands

```bash
bun install
bun run typecheck        # turbo: all packages + apps (extension prepare runs first)
bun run build            # server → apps/server/dist/index.js ; extension → apps/extension/.output/chrome-mv3
bun run dev:server       # bun --watch on the server
bun run dev:extension    # wxt dev server
bun run package:extension # wxt zip for the Chrome Web Store
```

## Two hard rules specific to this repo

- **The server must stay Node-compatible.** Dev runs under Bun, but it ships as a tsup-bundled Node bin (`npx monkbrowse`). No `Bun.*` APIs in `apps/server`.
- **`packages/protocol` and `packages/messaging` must stay isomorphic.** They compile with `lib: ES2022` and no `node`/`chrome`/`DOM` types, so they bundle into both the Node server and the MV3 service worker. `ws` appears only in `apps/server`; `chrome` only in `apps/extension`. See [.claude/rules/monorepo.md](.claude/rules/monorepo.md).
