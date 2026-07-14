# Chrome Web Store submission playbook

Everything needed to publish the monkbrowse extension. Copy the text blocks straight into the [Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## 0. One-time prerequisites

- A **Chrome Web Store developer account** ($5 one-time fee) at <https://chrome.google.com/webstore/devconsole>.
- The packaged zip (rebuild any time with `bun run package:extension`):
  - `apps/extension/dist/monkbrowse-<version>-chrome.zip`
- Privacy policy URL (already live): <https://monkfromearth.github.io/monkbrowse/privacy>

## 1. Upload

Dashboard → **Add new item** → upload the zip. It reads the manifest (name, version, icons) automatically.

## 2. Store listing

| Field | Value |
|---|---|
| **Name** | monkbrowse |
| **Summary** (≤132) | Let your AI drive the Chrome tabs you choose to share. Logged in, local, private. Works with Claude, Cursor, VS Code, and more. |
| **Category** | Developer Tools |
| **Language** | English |

**Description:**

```
monkbrowse lets an AI assistant drive the Chrome you already use — logged in, with your real profile — instead of a fresh, empty browser. You stay in control: by default the AI sees nothing, and you toggle exactly which tabs it may read and act on. Each shared tab gets a number, so you can just say "on tab 1, do X."

Why it's different:
• Uses your real, logged-in sessions (cookies, 2FA) — it works on sites that block bots and headless browsers.
• One assistant can drive many tabs across many Chrome profiles at the same time.
• 100% local and private: the extension talks only to a server on your own machine. No telemetry, no account, nothing sent to us.

Works with any MCP client: Claude, Cursor, VS Code, Windsurf, Gemini CLI, Codex, and more. Install the free monkbrowse server alongside your AI app (npx -y monkbrowse), then share a tab and go.

Full setup guide: https://monkfromearth.github.io/monkbrowse/guide/install
```

## 3. Graphic assets

| Asset | Spec | Status |
|---|---|---|
| Store icon | 128×128 PNG | ✅ ships in the zip (`icon/128.png`) |
| Screenshots | 1280×800 **or** 640×400 PNG/JPG, 1–5 | ⬜ capture (see below) |
| Small promo tile | 440×280 PNG/JPG | ⬜ optional but recommended |

**Screenshots to capture** (open the popup on a profile with a few tabs shared):

1. The popup — shared tabs at the top with `#1/#2`, the search bar, "Connected".
2. The popup mid-action — the "AI is working on #1" strip visible.
3. A caption card: "Tell your AI: on tab 1, summarize this page." (make in any slide tool at 1280×800).

Tip: 1280×800 looks best. Put each on a clean background with a one-line caption.

## 4. Privacy tab (required — this is where reviews get stuck)

**Single purpose:**

```
monkbrowse connects your browser to a local AI assistant (via the Model Context Protocol) and lets it read and act on the specific tabs you choose to share.
```

**Permission justifications** (paste per permission):

| Permission | Justification |
|---|---|
| `tabs` | List the tabs you choose to share and read their title/URL so you can pick which ones the AI may use and so the AI can target a specific tab. |
| `scripting` | Inject a content script into a shared tab to read its accessibility structure and perform the actions you ask for (click, type, scroll). |
| `storage` | Remember your per-tab share choices and local connection settings (port, profile name) across browser restarts. |
| `offscreen` | Hold the local WebSocket connection to the monkbrowse server in an offscreen document so it survives the service worker sleeping. |
| `alarms` | Periodically wake the extension to keep the local connection alive. |
| `activeTab` | Resolve the currently active tab when a request does not name one. |
| Host permission `<all_urls>` | You may share a tab on any website; the extension only accesses a page after you explicitly toggle that tab "shared." It runs on all sites because you decide, per tab, which ones. |

**Data usage disclosures** (check these):

- Does NOT collect or use data for anything beyond the single purpose above.
- Not sold or transferred to third parties. Not used for creditworthiness/lending.
- Not used for purposes unrelated to the single purpose.
- **Remote code:** No — all code is bundled in the package.

**Privacy policy URL:** `https://monkfromearth.github.io/monkbrowse/privacy`

## 5. Distribution

- Visibility: **Public** (or Unlisted first if you want to test the live listing privately).
- Regions: all.

## 6. Submit

Click **Submit for review**. First reviews typically take a few days. On approval, the public URL becomes:

```
https://chromewebstore.google.com/detail/monkbrowse/<ITEM_ID>
```

## 7. After approval — flip the links

Give me the `<ITEM_ID>` and I will swap the placeholder store URL (`chromewebstore.google.com/detail/monkbrowse`) for the real one in the docs Install page, both READMEs, and getting-started.
