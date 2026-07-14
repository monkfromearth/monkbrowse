# monkbrowse (server)

The MCP server half of **monkbrowse** — it lets an AI drive your real, logged-in Chrome across many tabs and profiles. It pairs with the monkbrowse **Chrome extension** (both halves are required).

```jsonc
// point your MCP client at it
{ "mcpServers": { "monkbrowse": { "command": "npx", "args": ["monkbrowse"] } } }
```

Then load the Chrome extension and share the tabs you want the AI to use. Full install (per AI app), the extension, tools, and architecture:

**→ https://github.com/monkfromearth/monkbrowse**

Apache-2.0.
