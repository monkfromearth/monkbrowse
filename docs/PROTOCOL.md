# Protocol (v2)

Two layers: the **messaging envelope** (how frames move) and the **message catalog** (what payloads mean). Both are defined in code — `packages/messaging` and `packages/protocol` — so this doc is a map, not a second source of truth.

## Messaging envelope — `packages/messaging`

A transport-agnostic `Peer` on each end of the WebSocket. Frames:

| Frame | Shape | Meaning |
|-------|-------|---------|
| request | `{ k: "req", id, type, payload }` | expects a response |
| response | `{ k: "res", id, ok, result? , error? }` | reply to a request id |
| notify | `{ k: "ntf", type, payload }` | fire-and-forget |
| ping / pong | `{ k: "png" }` / `{ k: "pog" }` | liveness |

- `peer.request(type, payload, {timeoutMs})` correlates by an incrementing id and rejects on timeout (`RequestTimeoutError`).
- `peer.notify(type, payload)` sends without expecting a reply.
- Either side can send requests. The server sends tool calls to the extension; the extension sends `hello` to the server and `tabs_changed` notifications.
- On disconnect, all in-flight requests reject. Only **idempotent reads** are retried after a timeout (`retryableMessages` in `packages/protocol`), never `click`/`type`/`navigate`.

The `Peer` needs a `PeerSocket` adapter (`send` / `close` / `onMessage` / `onClose`). The server builds it from `ws` (`apps/server/src/ws-adapter.ts`); the extension builds it from the browser `WebSocket` (`apps/extension/entrypoints/offscreen/main.ts`).

## Wire message catalog — `packages/protocol/src/messages.ts`

Server → extension requests. Every tab-scoped payload carries an optional `tabId` (omit → active tab); responses echo the resolved `tabId`.

| type | request | response |
|------|---------|----------|
| `browser_navigate` | `{ url, tabId? }` | `{ tabId }` |
| `browser_go_back` / `browser_go_forward` | `{ tabId? }` | `{ tabId }` |
| `browser_click` | `{ ref, element, tabId? }` | `{ tabId }` |
| `browser_type` | `{ ref, element, text, submit?, tabId? }` | `{ tabId }` |
| `browser_hover` | `{ ref, element, tabId? }` | `{ tabId }` |
| `browser_select_option` | `{ ref, element, values, tabId? }` | `{ tabId }` |
| `browser_press_key` | `{ key, tabId? }` | `{ tabId }` |
| `browser_get_console_logs` | `{ tabId? }` | `{ tabId, logs[] }` |
| `browser_screenshot` | `{ tabId? }` | `{ tabId, data }` (base64 png) |
| `browser_snapshot` | `{ tabId? }` | `{ tabId, url, title, snapshot }` (one round-trip) |
| `getUrl` / `getTitle` | `{ tabId? }` | `{ tabId, url }` / `{ tabId, title }` |
| `list_tabs` | `{}` | `{ tabs: TabInfo[] }` |
| `browser_switch_tab` | `{ tabId }` | `{ activeTabId }` |

`browser_wait` is handled **server-side** (a sleep) — it never hits the extension.

## Control messages — `packages/protocol/src/handshake.ts`

Extension-initiated:

| type | direction | payload |
|------|-----------|---------|
| `hello` (request) | ext → server | `{ profileId, label, chromeProfileName?, extVersion, tabs[] }` → `hello_ack { ok, assignedPort, serverVersion, reason? }` |
| `tabs_changed` (notify) | ext → server | `{ tabs: TabInfo[] }` |

`hello` runs before anything else on a socket; a socket that doesn't say hello within 10s is dropped. `hello_ack.ok === false` means the port is already held by a different profile — the extension surfaces `reason` and does not retry until its port changes.

## AI-facing tool schemas — `packages/protocol/src/tools.ts`

These are separate from the wire messages: they add `profile?` (port or label) and `tab?` — the simple per-profile number shown in the popup — for the AI to target a profile+tab. The server (`apps/server/src/tools/index.ts`) resolves `profile` to a connection and maps `tab` (a `slot`) to the real chrome `tabId`, which is what gets threaded into the wire payload. Schemas convert to JSON Schema via the `@monkbrowse/protocol/json-schema` subpath for MCP `tools/list`.

## Internal extension bridge (not on the wire)

Inside the extension, the offscreen doc and service worker talk over `chrome.runtime` messages tagged with `to: "bg" | "off"` and a `kind` (`exec`, `hello-info`, `socket-status`, `tabs-push`, `reconnect`, …) — see `apps/extension/lib/constants.ts`. Content-script messages are tagged `cs: true`. These never leave the browser.
