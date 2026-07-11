# Monorepo & build — read before touching structure or the toolchain

Turborepo + **Bun** workspaces + TypeScript. `apps/{server,extension}` + `packages/{protocol,messaging,config,utils}`. Everything builds and runs (this replaced the v1 server-only extraction that couldn't).

## Non-negotiables

- **Server stays Node-compatible.** Dev runs under Bun (`bun --watch`), but the shipped artifact is a **tsup ESM Node bin** (`npx monkbrowse`). No `Bun.*` APIs anywhere in `apps/server`. Keep using `ws` for the WebSocket server and `@modelcontextprotocol/sdk` for stdio.
- **`packages/protocol` and `packages/messaging` are isomorphic.** They compile with `lib: ["ES2022"]` and **no** `node` / `chrome` / `DOM` types, so they bundle into both the Node server and the MV3 service worker. Enforcement is at the tsconfig level: a leaked `process`, `chrome`, or `document` fails typecheck. The only timer globals they rely on are declared in a local `globals.d.ts`.
  - `ws` appears **only** in `apps/server`. `chrome` appears **only** in `apps/extension`.
  - `packages/messaging` never imports a socket library — the caller injects a `PeerSocket` adapter.
- **One zod instance.** `zod` and `zod-to-json-schema` come from the Bun **catalog** (root `package.json`) via `"zod": "catalog:"`. Don't add a second zod copy — cross-boundary schemas break with "not a ZodType".
- **Internal packages export source `.ts`** (no `dist` build). Both consumers bundle (tsup / Vite), so there's no build-order step. Don't add a `dist` build to a `@monkbrowse/*` package unless you're publishing it standalone.
- **Extension is built by WXT, not Bun.** Bun can't assemble an MV3 manifest. Bun is workspace manager + dev runner + test runner only.
- `zod-to-json-schema` is server-only — reach it via `@monkbrowse/protocol/json-schema`, never from `@monkbrowse/protocol` (that would drag it into the extension bundle).

## Commands

```bash
bun install
bun run typecheck          # turbo; extension `prepare` (wxt) runs before its typecheck
bun run build              # server dist + extension .output/chrome-mv3
bun run dev:server         # bun --watch
bun run dev:extension      # wxt dev
bun run package:extension  # wxt zip
```

`bun run typecheck` must pass across all seven tasks before you claim a change works — it's also the isomorphism guard.
