# Architecture (v2)

One-stop guide to how Monkbrowse drives many tabs across many Chrome profiles from a single MCP server.

---

## 1. What this is

An **MCP server** (a Node/Bun CLI) plus an **MV3 Chrome extension**. Together they let an AI app automate the Chrome you already use — logged in, real fingerprint — instead of a fresh headless browser.

The defining capability: **one server, many profiles, many tabs, concurrently.** v1 (and every single-socket clone we surveyed) held exactly one WebSocket and dropped the previous connection on each new one — so only one tab in one profile could ever be driven. v2 replaces that single socket with a **registry** and adds explicit tab addressing.

Why the extension route (not CDP/`--remote-debugging-port`): it uses your **real, logged-in** profile with no relaunch, and Chrome's newer security rules don't let you point the debug port at your live default profile anyway.

---

## 2. The processes

```
┌───────────────┐  stdio (MCP)  ┌──────────────────────────────────┐  WebSocket   ┌───────────────────────────┐
│   AI app      │◀─────────────▶│         MCP server (this)        │◀────:9222───▶│ extension — profile "Work"│
│ Claude/Cursor │               │  ConnectionRegistry              │◀────:9223───▶│ extension — profile "Home"│
└───────────────┘               │   Map<port, ProfileConnection>   │              └───────────────────────────┘
                                │  one ws.WebSocketServer per port │
                                └──────────────────────────────────┘
```

- **AI app** — the MCP client; launches the server and speaks MCP over stdio.
- **Server** — `apps/server`. Exposes browser tools to the AI, and binds **one WebSocket listener per profile port**. Routes each tool call to the right profile connection and tab.
- **Extension** — `apps/extension`, loaded in each Chrome profile. Connects to that profile's port and performs the actions in real tabs.

stdout is the MCP transport, so all server logs go to **stderr** (`apps/server/src/log.ts`).

---

## 3. Addressing: port = profile, id = tab

"A port per tab" is impossible — tabs multiplex over one connection. It resolves to:

- **Profile** ⇒ a **port**. Each profile's extension is configured (in its options page) to connect to one port; the server binds a range (`basePort`..`basePort+portCount`, default 9222–9241).
- **Tab** ⇒ a **tab id** within that profile.

Every interaction tool takes optional `profile` (a port number or profileId) and `tabId`. Omit `profile` → the **focused profile** (the only connected one, else the most-recently-used). Omit `tabId` → the extension uses that profile's **active tab** and echoes back the id it resolved. New tools `browser_list_tabs` (aggregates every profile, composite ids like `9223:5417`) and `browser_switch_tab` round it out.

---

## 4. Request lifecycle

Trace `browser_click { profile: 9223, tabId: 5417, ref, element }`:

```
AI ──MCP CallTool──▶ apps/server/src/mcp.ts
     validate args with the tool's zod schema (packages/protocol)
        │
        ▼ apps/server/src/tools/index.ts
     registry.resolveProfile(9223) → ProfileConnection
     queue key "9223:5417" → serialize same-tab calls
        │
        ▼ apps/server/src/registry.ts  (send)
     conn.peer.request("browser_click", { ref, element, tabId }, {timeout})
        │  messaging envelope over the WebSocket
        ▼ extension: offscreen doc receives the request frame
     relays to the service worker (chrome.runtime message)
        ▼ apps/extension/lib/executor.ts
     resolve tab → content script → clickRef(ref) on [data-mcp-ref=ref]
        ▲ result { tabId }
     server chains captureAriaSnapshot(tabId) → one browser_snapshot round-trip
        ▲
AI ◀── "Clicked ..." + fresh ARIA snapshot
```

Most action tools return a **fresh ARIA snapshot** of the resolved tab, so the AI sees the new state without a screenshot. The snapshot is one round-trip returning url+title+yaml together (v1 chained three calls that could straddle a tab change).

---

## 5. The connection registry (the fix)

`apps/server/src/registry.ts`. `ConnectionRegistry` owns `Map<port, ProfileConnection>` plus a `Map<profileId, port>` index. Per port:

```
ProfileConnection = { port, peer|null, profileId, label, status, connectedAt, tabs: Map<tabId,TabInfo> }
```

- **One `ws.WebSocketServer` per port** (`apps/server/src/ws-server.ts`). The port is the routing key — unambiguous at the TCP layer.
- **Handshake:** the extension's first frame is a `hello` request `{ profileId, label, extVersion, tabs }`; the server replies `hello_ack`. `profileId` is a uuid the extension persists in `chrome.storage.local` — it's the reconnect key, stable across service-worker restarts.
- **Replace-same-profile-only:** a reconnect with the *same* profileId reuses the slot (keeps label + tabs). A *different* profileId on a live port is **rejected** ("pick a different port"), never evicts the incumbent. This is the exact opposite of v1's "close the previous socket."
- **Disconnect keeps the record** (`peer=null`, `status='disconnected'`) so a suspended service worker's slot survives until it reconnects.
- **Liveness:** the server pings each peer (`packages/messaging`); after `maxMissedPongs` it drops the socket.

---

## 6. Concurrency

`apps/server/src/queue.ts`. Requests are correlated by id over each socket, so:

- **Across profiles:** free parallelism — different profiles are different sockets, different pending maps.
- **Within a profile, different tabs:** run in parallel.
- **Same tab, mutating calls:** serialized by a `TargetQueueManager` keyed `"port:tabId"`, so a type-then-click never interleaves.

---

## 7. Inside the extension (MV3)

`apps/extension`. The hard MV3 problem: a service worker suspends after ~30s idle, killing any socket it owns. Solution, split across three contexts:

- **Offscreen document** (`entrypoints/offscreen/main.ts`) **owns the WebSocket** and the messaging `Peer`. Offscreen docs aren't subject to SW idle-suspension, so the socket survives. It relays each incoming request to the service worker and returns the result.
- **Service worker** (`entrypoints/background.ts`) is the **Chrome-API executor**. It creates/keeps the offscreen doc alive (a `chrome.alarms` heartbeat every ~24s, plus recreation on startup/install), builds the `hello` payload, watches `chrome.tabs` and pushes `tabs_changed`, and runs `lib/executor.ts` to perform each action by tab id.
- **Content script** (`entrypoints/content.ts` + `lib/dom.ts`) does the in-page work: builds the ARIA snapshot (stamping `data-mcp-ref` on elements), resolves those refs for click/type/hover/select, and buffers console logs. The SW injects it on demand for tabs opened before the extension loaded.
- **Popup + options** (`entrypoints/popup`, `entrypoints/options`) show connection status and let the user set this profile's **port + label**.

Navigation, screenshots, tab list/switch run directly in the SW; DOM ops go to the content script.

---

## 8. Shared packages

- **`packages/protocol`** — the single source of truth for both contracts, in zod: the **AI-facing tool schemas** (`tools.ts`) and the **server↔extension wire messages** (`messages.ts`, every tab-scoped payload carries `tabId`). Server-only JSON-Schema conversion is isolated behind the `./json-schema` subpath so the extension bundle never pulls in `zod-to-json-schema`.
- **`packages/messaging`** — a transport-agnostic `Peer`: request/response with correlation ids + timeouts, notifications, and ping/pong. It has **no `ws`, no `chrome`, no `node`** — the caller injects a `PeerSocket` adapter (server wraps `ws`; extension wraps the browser `WebSocket`). This is what lets the same request/response logic run on both sides.
- **`packages/config`** — port range + names + error strings, with the `/app.config` and `/mcp.config` subpaths.
- **`packages/utils`** — `wait`, `backoffDelay`, `compositeTabId`.

---

## 9. Build & run

- **Server:** dev with Bun (`bun --watch`); ship with **tsup** to an ESM Node bin (`apps/server/tsup.config.ts` inlines the `@monkbrowse/*` packages via `noExternal`, keeps npm deps external). `npx monkbrowse` works like v1.
- **Extension:** **WXT** (Vite) builds the MV3 bundle; `wxt build` → unpacked `dist/chrome-mv3`, `wxt zip` → Web Store zip.
- **Isomorphism guard:** `packages/protocol` + `packages/messaging` compile with no node/chrome/DOM types, so a leaked `process`/`chrome`/`document` fails typecheck rather than breaking the service worker at runtime.

---

## 10. Verified end-to-end

Without Chrome, a harness drives the real server over MCP stdio while simulating two profile extensions over WebSocket. It confirms: the MCP handshake and 14 tools; `browser_list_tabs` aggregating two profiles with composite ids; **two profiles connected on 9222 and 9223 at once with no eviction**; per-profile addressing by port; and concurrent calls to both profiles. To test the *real* extension you still load it in Chrome (see the verification section of the plan).
