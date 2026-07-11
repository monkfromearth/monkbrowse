# Tool reference

The MCP tools monkbrowse exposes. Source of truth: `packages/protocol/src/tools.ts`.

## Targeting: `profile` and `tab`

Most tools accept two optional arguments:

- **`profile`** — which Chrome profile: a **port** number (`9222`), its **label**, or its **profileId**. Omit it to use the **focused profile** (the only connected one, or the most recently used).
- **`tab`** — which tab, as the **simple number** shown in the monkbrowse popup and `browser_list_tabs` (`1`, `2`, `3`…). Omit it to use that profile's **active tab**.

These are the same numbers the user sees in the extension popup, so a user can say "on tab 2, …" and the AI passes `{ tab: 2 }`. Run `browser_list_tabs` any time to see the current numbering.

After an action that changes the page, the tool returns a fresh **accessibility snapshot** so the AI can see the result and pick the next `ref`.

## Navigation

| Tool | Arguments | Does |
|---|---|---|
| `browser_navigate` | `url`, `profile?`, `tab?` | Navigate a tab to a URL, wait for load, return a snapshot. |
| `browser_go_back` | `profile?`, `tab?` | Back in history + snapshot. |
| `browser_go_forward` | `profile?`, `tab?` | Forward in history + snapshot. |

## Reading

| Tool | Arguments | Does |
|---|---|---|
| `browser_snapshot` | `profile?`, `tab?` | Capture the accessibility snapshot (URL + title + ARIA tree). Preferred over a screenshot for understanding structure and getting element `ref`s. |
| `browser_screenshot` | `profile?`, `tab?` | PNG of the visible tab. |
| `browser_get_console_logs` | `profile?`, `tab?` | Buffered console output for the tab. |

## Interacting

Element-targeting tools take an `element` (human description) and a `ref` (from the latest snapshot).

| Tool | Arguments | Does |
|---|---|---|
| `browser_click` | `element`, `ref`, `profile?`, `tab?` | Click an element. |
| `browser_hover` | `element`, `ref`, `profile?`, `tab?` | Hover an element. |
| `browser_type` | `element`, `ref`, `text`, `submit?`, `profile?`, `tab?` | Type into an editable element; `submit: true` presses Enter after. |
| `browser_select_option` | `element`, `ref`, `values[]`, `profile?`, `tab?` | Select option(s) in a `<select>`. |
| `browser_press_key` | `key`, `profile?`, `tab?` | Press a key (e.g. `Enter`, `ArrowDown`, `a`). |
| `browser_wait` | `time` | Wait N seconds (handled server-side; no browser needed). |

## Tabs & profiles

| Tool | Arguments | Does |
|---|---|---|
| `browser_list_tabs` | — | List **every** tab across **every** connected profile, with their number, label, and which is active. |
| `browser_switch_tab` | `tab`, `profile?` | Make a tab the active tab in its profile. |

## Examples

```jsonc
// See everything, everywhere
{ "name": "browser_list_tabs", "arguments": {} }

// Drive a specific profile by port
{ "name": "browser_navigate", "arguments": { "profile": 9223, "url": "https://news.ycombinator.com" } }

// Read a specific tab
{ "name": "browser_snapshot", "arguments": { "profile": 9222, "tab": 2 } }

// Act on the focused profile's active tab (no targeting needed)
{ "name": "browser_type", "arguments": { "element": "Search box", "ref": "e8", "text": "monkbrowse", "submit": true } }
```

## Notes

- **Concurrency:** calls to different profiles or different tabs run in parallel; two mutating calls to the *same* tab are serialized so they can't interleave.
- **Refs are per-snapshot:** a `ref` (`e12`) is stamped during a snapshot. If the page changed, capture a new snapshot — a stale ref returns an error rather than clicking the wrong thing.
- **Idempotent reads retry; actions don't:** a timed-out snapshot/read is retried automatically; a click or type is never silently re-sent.
- Adding a tool? See [.claude/rules/mcp-tools.md](../.claude/rules/mcp-tools.md) and the `add-mcp-tool` skill.
