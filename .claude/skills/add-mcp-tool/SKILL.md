---
name: add-mcp-tool
description: Add a new browser automation tool to Monkbrowse (server + extension). Use when the user wants to expose a new browser capability the AI can call, or asks how tools are added to this codebase.
---

# Add an MCP tool

A tool spans up to four files across the monorepo. Do all four (server-only tools skip 2 and 4). Full context: [.claude/rules/mcp-tools.md](../../rules/mcp-tools.md), [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md).

## Steps

1. **Schema (AI-facing)** — `packages/protocol/src/tools.ts`. Add a `ToolDef` via `def(name, description, z.object({ ... , ...target }))`. Include `...target` (`profile?`, `tabId?`) for anything tab-scoped. Add it to `ALL_TOOLS`.

2. **Wire message** (if it hits the browser) — `packages/protocol/src/messages.ts`. Add a `socketMessages` entry: request (with `tabId?`) + response (echo `tabId`). Add to `messageTimeouts` if slow; to `retryableMessages` only if it's an idempotent read.

3. **Server handler** — `apps/server/src/tools/index.ts`, in `toolHandlers`. Pattern:
   ```ts
   browser_x: (ctx, raw) => {
     const args = raw as XArgs;               // z.infer of the tool schema
     return onTab(ctx, args, async (conn, tabId) => {
       const res = await ctx.registry.send(conn, "browser_x", { ...fields, tabId });
       const snap = await captureAriaSnapshot(ctx.registry, conn, res.tabId); // if it mutates the page
       return ok(`Did X`, snap.content);
     });
   },
   ```
   Server-only tools (like `browser_wait`) skip `onTab`/`send` and just compute a result.

4. **Extension executor** — `apps/extension/lib/executor.ts` `execWire`: handle the new `type`. Tabs/navigation/screenshot run in the service worker; DOM ops call `cs(tabId, { kind })`, which you implement in `entrypoints/content.ts` + `lib/dom.ts` (resolving elements by their snapshot `ref`).

## Checklist
- [ ] `ToolDef` added and in `ALL_TOOLS` (`tools.ts`)
- [ ] `socketMessages` entry with `tabId?` (skip for server-only tools)
- [ ] handler in `toolHandlers`, snapshot appended if it changes the page
- [ ] `execWire` branch (+ content-script op if DOM)
- [ ] `bun run typecheck` passes (shared schema fails to compile on mismatch)
- [ ] exercised via the WebSocket harness or the real extension in Chrome
