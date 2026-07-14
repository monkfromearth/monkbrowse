import { defineConfig } from "wxt";

// https://wxt.dev/api/config.html
export default defineConfig({
  // Build into dist/ (dist/chrome-mv3, dist/*.zip) to match the server's dist/.
  outDir: "dist",
  zip: {
    name: "monkbrowse",
  },
  manifest: {
    name: "Monkbrowse",
    description:
      "Automate your logged-in Chrome from any MCP client — one profile per port, many tabs.",
    permissions: [
      "tabs",
      "scripting",
      "storage",
      "offscreen",
      "alarms",
      "activeTab",
    ],
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "Monkbrowse",
      default_icon: {
        16: "icon/16.png",
        32: "icon/32.png",
      },
    },
    // MV3 blocks ws:// by default — allow localhost WebSocket + HTTP to the server.
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'self'; connect-src 'self' ws://127.0.0.1:* ws://localhost:* http://127.0.0.1:* http://localhost:*;",
    },
  },
});
