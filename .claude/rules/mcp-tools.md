# Adding or changing a browser tool

Background: [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md), [docs/PROTOCOL.md](../../docs/PROTOCOL.md).

A tool now spans up to four places. Miss one and it either won't appear, won't route, or won't act.

## The four touch points

1. **AI-facing schema** — `packages/protocol/src/tools.ts`. Add a `ToolDef` (name, description, zod args). Interaction tools include the shared `...target` (`profile?`, `tabId?`). Add it to `ALL_TOOLS`.
2. **Wire message** (if it talks to the browser) — `packages/protocol/src/messages.ts`. Add a `socketMessages` entry: request payload (with `tabId?`) + response (echo `tabId`). Add a per-type timeout in `messageTimeouts` if slow, and to `retryableMessages` only if it's an idempotent read.
3. **Server handler** — `apps/server/src/tools/index.ts`. Add to `toolHandlers`. Use `onTab(ctx, args, (conn, tabId) => …)` to resolve the profile, serialize per tab, and call `ctx.registry.send(conn, "type", { …, tabId })`. If the action changes the page, end with `captureAriaSnapshot(ctx.registry, conn, res.tabId)` and append `snap.content`.
4. **Extension executor** — `apps/extension/lib/executor.ts` `execWire`. Handle the new wire `type`: run it in the service worker (tabs/navigation/screenshot) or delegate to the content script (`cs(tabId, {kind})`, implemented in `entrypoints/content.ts` + `lib/dom.ts` for DOM ops).

## Rules

- **Names/descriptions/args live in `packages/protocol`**, not hard-coded in the server or extension. Both sides import the same schemas — that's the point of the monorepo.
- **Thread `tabId` everywhere.** The AI targets `{profile, tabId}`; the server resolves `profile` → connection and passes `tabId` on the wire; the extension resolves an absent `tabId` to the active tab and **echoes the resolved id**. A snapshot after an action must use the resolved `tabId` (see `captureAriaSnapshot`).
- **Mutating vs read.** Serialize mutations per tab (that's what `onTab` + the queue do). Don't mark a mutation retryable.
- **Server-only tools** (no browser round-trip, e.g. `browser_wait`) just run in the handler — no wire message, no executor branch.
- After changes: `bun run typecheck` (both sides share the schema, so a mismatch fails to compile), then exercise it — the WebSocket harness in the plan's verification, or the real extension in Chrome.
