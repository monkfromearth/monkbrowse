---
layout: home

hero:
  name: monkbrowse
  text: Your AI, in your real browser.
  tagline: One MCP server drives many Chrome tabs across many profiles — the tabs you choose to share. Logged in, real fingerprint, no relaunch.
  image:
    src: /logo.svg
    alt: monkbrowse
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Tool reference
      link: /guide/tools
    - theme: alt
      text: GitHub
      link: https://github.com/monkfromearth/monkbrowse

features:
  - title: Real, logged-in Chrome
    details: Works behind your logins, 2FA, and bot walls — because it is your browser and your session, not a fresh headless one.
  - title: Many tabs, many profiles
    details: A single server drives Work, Personal, and QA at once, each on its own port. A second profile never evicts the first.
  - title: You choose what it sees
    details: The AI sees nothing until you flip a tab "shared" in the popup. Each shared tab gets a number, so you can say "on tab 2, do X."
  - title: 22 tools, shadow-DOM aware
    details: Navigate, click, type, scroll, screenshot, and run JS. Snapshots pierce shadow DOM and same-origin iframes; concurrent across tabs.
---
