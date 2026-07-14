---
title: Privacy Policy
---

# Privacy Policy

_Last updated: 14 July 2026._

**monkbrowse is built to be private by design. It does not collect, store, sell, or transmit your data to us or any third party. Everything runs on your own computer.**

## The short version

- The monkbrowse server binds only to `127.0.0.1` (your own machine). The Chrome extension talks only to that local server.
- Nothing is sent to monkbrowse's authors, and there are **no analytics, no telemetry, and no account**.
- The AI can see and act on a tab **only after you explicitly share it** in the popup. Unshared tabs are invisible to it, and a request against an unshared tab is refused.
- The extension stores your choices (which tabs are shared, the local port and profile name) in Chrome's local storage on your device. That is all.

## What the extension accesses, and why

monkbrowse needs certain browser capabilities to do its one job: let a local AI assistant read and act on the tabs you choose to share.

- **Page content of shared tabs** — read to build an accessibility snapshot and to perform the actions you ask for (click, type, scroll, navigate). Only for tabs you toggled on.
- **Tab list (titles and URLs)** — so you can pick which tabs to share and so the AI can target a specific one. Only shared tabs are exposed to the assistant.
- **Local storage** — to remember your shared tabs and connection settings across restarts.

None of this leaves your device. The AI assistant you connect (Claude, Cursor, and so on) runs under its own privacy terms; monkbrowse simply relays your requests to your own browser locally.

## Data sharing

We do not collect your data, so there is nothing to share, sell, or transfer. monkbrowse contains no third-party trackers and makes no network calls except the local connection to the server on `127.0.0.1`.

## Your control

- Unshare any tab at any time in the popup; the assistant immediately loses access.
- Remove the extension to stop everything and clear its local storage.

## Contact

Questions or concerns: open an issue at [github.com/monkfromearth/monkbrowse](https://github.com/monkfromearth/monkbrowse/issues).
