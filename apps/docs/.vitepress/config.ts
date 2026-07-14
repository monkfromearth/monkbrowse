import { defineConfig } from "vitepress";

export default defineConfig({
  title: "monkbrowse",
  description:
    "One MCP server drives your real Chrome across many tabs and profiles — the tabs you choose to share. Logged in, real fingerprint, no relaunch.",
  // GitHub Pages project site: served under /monkbrowse/. Swap to "/" for a custom domain.
  base: "/monkbrowse/",
  cleanUrls: true,
  // Included docs use repo-relative links (LICENSE, .claude/…) that only resolve
  // on GitHub, not on the site. Don't fail the build on them.
  ignoreDeadLinks: true,
  head: [
    // Head links are NOT auto-prefixed with `base`, so include /monkbrowse/ or
    // the favicon 404s on the project Pages site. Keep in sync with `base`.
    ["link", { rel: "icon", type: "image/svg+xml", href: "/monkbrowse/favicon.svg" }],
  ],
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Install", link: "/guide/install" },
      { text: "Use cases", link: "/guide/use-cases" },
      { text: "Tools", link: "/guide/tools" },
      { text: "Architecture", link: "/guide/architecture" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Install", link: "/guide/install" },
          { text: "Get started", link: "/guide/getting-started" },
          { text: "Use cases", link: "/guide/use-cases" },
          { text: "Tool reference", link: "/guide/tools" },
        ],
      },
      {
        text: "Concepts",
        items: [
          { text: "Sharing tabs", link: "/guide/sharing" },
          { text: "Connections & profiles", link: "/guide/connection" },
        ],
      },
      {
        text: "Internals",
        items: [
          { text: "Architecture", link: "/guide/architecture" },
          { text: "Protocol", link: "/guide/protocol" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/monkfromearth/monkbrowse" },
    ],
    footer: {
      message:
        'Apache-2.0 licensed. <a href="/monkbrowse/privacy">Privacy</a>',
      copyright: "monkbrowse — drive your real browser with AI.",
    },
    search: { provider: "local" },
  },
});
