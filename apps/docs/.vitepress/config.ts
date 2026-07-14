import { defineConfig } from "vitepress";

export default defineConfig({
  title: "monkbrowse",
  description:
    "One MCP server drives your real Chrome across many tabs and profiles — the tabs you choose to share. Logged in, real fingerprint, no relaunch.",
  cleanUrls: true,
  // Included docs use repo-relative links (LICENSE, .claude/…) that only resolve
  // on GitHub, not on the site. Don't fail the build on them.
  ignoreDeadLinks: true,
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
  ],
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Get started", link: "/guide/getting-started" },
      { text: "Tools", link: "/guide/tools" },
      { text: "Architecture", link: "/guide/architecture" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Get started", link: "/guide/getting-started" },
          { text: "Tool reference", link: "/guide/tools" },
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
      message: "Apache-2.0 licensed.",
      copyright: "monkbrowse — drive your real browser with AI.",
    },
    search: { provider: "local" },
  },
});
