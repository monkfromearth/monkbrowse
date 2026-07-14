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

## Code review (round 1) — outcomes

Fixed on `main`:
- [x] Offscreen reconnect storm (per-socket generation guard; the connect/evict flapping)
- [x] SW-restart stale `connected` (offscreen re-reports on `status-query`; push gate removed)
- [x] Screenshot restores the user's focus after capturing a background tab
- [x] `waitForLoad` no longer resolves on the old page's lingering "complete"
- [x] `defaultSharedTab` uses the single last-focused tab (not per-window `active`)
- [x] `list_tabs` no longer corrupts the default-profile choice (`markUsed` moved to real actions)
- [x] Retry-after-timeout re-checks the peer (no null-deref); duplicate-hello ping-timer leak; ping timeout < interval; ws `error` listener; shares cache survives a storage hiccup

Deferred (need a bigger change / empirical check):
- [ ] **Main-world injection (H3):** console capture, dialog guards, and `browser_evaluate`
      run in the isolated world today — so `browser_get_console_logs` misses page logs,
      dialogs aren't intercepted, and `evaluate`/`wait`-for-text can be CSP-blocked on
      strict sites (GitHub). Move these to a `world: "MAIN"` injected script + a bridge.
- [ ] Slot-number policy: reuse-lowest-free vs monotonic (stable-number). Decide, then doc/fix.
- [ ] Localhost socket has no auth (any local process could drive a shared tab). Add a hello token.

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

- [x] Toolbar badge shows the **shared count** (e.g. `3`) instead of `on`
- [x] Search auto-focus on open; keyboard nav (arrows move, Enter toggles, Esc clears)
- [x] Shared tabs pinned to a "Shared" group on top
- [x] "Go to tab" affordance on row hover (jump Chrome to that tab)
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
