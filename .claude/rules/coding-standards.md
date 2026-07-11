# Coding standards

Conventions this repo already follows. Match them; don't reinvent.

## Language & modules
- **TypeScript, ESM only** (`"type": "module"`). Use `import`, never `require`.
- **`strict` is on** (plus `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules` from `tsconfig.base.json`). Don't let `any` leak through public types.
- Import across packages via their **workspace names** (`@monkbrowse/protocol`, `@monkbrowse/messaging`, …), not deep relative paths into another package. Within a package, use relative imports.
- Keep the isomorphism rule (see [monorepo.md](monorepo.md)): no `node`/`chrome`/`DOM` globals in `packages/protocol` or `packages/messaging`.

## Validate at the boundary
- MCP tool args are validated with their zod schema **before** use — done centrally in `apps/server/src/mcp.ts` (`tool.arguments.parse(...)`), so handlers receive typed args.
- The extension validates control frames it receives (`HelloSchema.parse`, `TabsChangedSchema.parse`) and the server validates wire responses (`socketMessages[type].response.parse`). Validate untrusted input at the edge; trust it inside.

## Logging
- **Never `console.log` in the server.** stdout is the MCP transport; a stray log corrupts the protocol. Use `debugLog` from `apps/server/src/log.ts` (stderr).
- In the extension, `console.*` is fine (and the content script buffers it for `browser_get_console_logs`).

## Errors
- Server tool handlers may throw; `apps/server/src/mcp.ts` converts thrown errors into `{ isError: true }` results. Don't swallow an error into a fake success.
- Surface **actionable** messages. Copy the registry's pattern: name the port/label and tell the user to connect (`registry.ts` `noConnectionMessage`).

## Style
- Named exports, not default (except WXT entrypoints, which require `export default defineBackground/defineContentScript`).
- Keep server tool handlers small: `onTab(resolve profile + serialize)` → `registry.send` → optional `captureAriaSnapshot` → return.
- Follow the surrounding formatting; don't introduce a new import order or bracket style.
