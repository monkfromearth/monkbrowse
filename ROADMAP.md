# monkbrowse roadmap

What's done, what's next, and in what order. Checked = shipped on `main`.

## Shipped (v0.2)

- [x] Turborepo + Bun + TS monorepo; shared zod protocol; isomorphic messaging peer
- [x] One MCP server, many Chrome profiles (one port per profile, no eviction)
- [x] Explicit per-tab sharing; simple tab numbers (#1, #2); friendly popup
- [x] 22 tools; shadow-DOM + same-origin-iframe snapshot; `browser_evaluate` escape hatch
- [x] Per-tab serialization + cross-tab/profile concurrency; retry only idempotent reads
- [x] MV3 survival: offscreen-owned socket, keepalive alarm, reconnect w/ backoff
- [x] ~96 tests incl. headless-DOM engine, fake-chrome executor, full-loop (no Chrome needed)
- [x] Doctor (`bun run doctor --probe`) + CDP debug harness for extension consoles
- [x] Brand (mark, wordmark, icons), per-AI-app install README, docs set
- [x] Popup v3: search, favicons, Share all, single scroll, a11y
- [x] npm-publishable server (`npx monkbrowse`, name claimed in manifest, unpublished)

## Now — finalize & publish

- [ ] Real-Chrome verification checklist: SW suspension survival, injection into
      pre-open tabs, multi-profile (9222 + 9223), complex-SPA snapshot quality
- [ ] Snapshot tuning on heavy SPAs (LinkedIn-class pages under-report)
- [ ] `npm publish` (server) — `cd apps/server && bun run build && bun publish`
- [ ] Chrome Web Store submission (zip exists: `apps/extension/dist/monkbrowse-*.zip`)
      + store listing copy/screenshots
- [ ] CI: GitHub Actions running `typecheck · test · build · lint` on push
- [ ] Flip repo public; enable the docs site hosting

## Next — UX quick wins (popup & feedback)

- [ ] Toolbar badge shows the **shared count** (e.g. `3`) instead of `on`
- [ ] Search auto-focus on open; keyboard nav (arrows move, Enter toggles, Esc clears)
- [ ] Shared tabs pinned to a "Shared" group on top (or a Shared-only filter chip)
- [ ] "Go to tab" affordance on row hover (jump Chrome to that tab)
- [ ] First-run tip card (share a tab → say "on tab 1, …")
- [ ] Sensitive-site nudge when sharing banking/auth pages
- [ ] Live "AI is acting here" pulse on the row (needs server→extension activity signal)
- [ ] Dark mode for the popup
- [ ] "Always share this site" per-site rules

## Later — capability & platform

- [ ] Cross-origin iframes + network inspection (hybrid `chrome.debugger`/CDP driver)
- [ ] Coordinate/vision-based clicking for canvas-y pages (maps, editors)
- [ ] Download handling; richer file-upload flows
- [ ] Multi-window awareness (window ids in list_tabs; per-window targeting)
- [ ] Firefox port (WXT already multi-target; needs MV2/MV3 divergence work)
- [ ] Session recording/replay of AI actions (audit log the user can inspect)
- [ ] Publish `@monkbrowse/protocol` standalone for third-party executors

## Docs & site

- [ ] `apps/docs` VitePress site (landing + guides) — serves `docs/*.md`
- [ ] Host (GitHub Pages once public, or Vercel/Cloudflare) at a real domain
- [ ] Demo GIF/video for README + store listing
