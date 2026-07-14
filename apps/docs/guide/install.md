# Install

Two small steps and you are done. No config files to hand-edit unless you want to.

1. **Add the monkbrowse server to your AI client** (one click or one command below).
2. **Install the Chrome extension** and share a tab.

![monkbrowse popup — pick which tabs the AI can use](/screenshot-1.png)

The server runs straight from npm with `npx` (or `bunx` / `pnpm dlx`), so there is nothing to download or build. Your AI client starts it automatically.

::: tip You do not need to read any source
End users never clone the repo. Pick your client below, click the button or paste the one line, install the extension, done.
:::

## 1. Add monkbrowse to your AI client

### Cursor

<a href="cursor://anysphere.cursor-deeplink/mcp/install?name=monkbrowse&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm1vbmticm93c2UiXX0="><img alt="Add monkbrowse to Cursor" src="https://img.shields.io/badge/Add%20to-Cursor-0b0b0b?style=for-the-badge&logo=cursor&logoColor=white" height="34"></a>

One click adds it. If the button does not open Cursor, go to **Settings → MCP → Add new global MCP server** and paste:

```json
{ "command": "npx", "args": ["-y", "monkbrowse"] }
```

### VS Code

<a href="vscode:mcp/install?%7B%22name%22%3A%22monkbrowse%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22monkbrowse%22%5D%7D"><img alt="Install monkbrowse in VS Code" src="https://img.shields.io/badge/Install%20in-VS%20Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white" height="34"></a>

Or from a terminal (works with the `code` CLI):

```bash
code --add-mcp '{"name":"monkbrowse","command":"npx","args":["-y","monkbrowse"]}'
```

### Claude Code

One command, nothing else:

```bash
claude mcp add monkbrowse -- npx -y monkbrowse
```

Add `--scope user` to make it available in every project:

```bash
claude mcp add --scope user monkbrowse -- npx -y monkbrowse
```

### Gemini CLI

```bash
gemini mcp add monkbrowse npx -y monkbrowse
```

Add `-s user` to install it for every project (`~/.gemini/settings.json`).

### Codex CLI (OpenAI)

```bash
codex mcp add monkbrowse -- npx -y monkbrowse
```

### Cursor CLI

The `cursor-agent` CLI uses the **same config as the Cursor editor** — there is no separate `mcp add` command. Use the [one-click button](#cursor) above, or add monkbrowse to `~/.cursor/mcp.json`:

```json
{ "mcpServers": { "monkbrowse": { "command": "npx", "args": ["-y", "monkbrowse"] } } }
```

### Windsurf

Settings → **Cascade → MCP servers → Add server**, then paste:

```json
{
  "mcpServers": {
    "monkbrowse": { "command": "npx", "args": ["-y", "monkbrowse"] }
  }
}
```

Hit the refresh icon in the MCP panel and monkbrowse appears.

### Claude Desktop

Settings → **Developer → Edit Config**, and add monkbrowse to `mcpServers`:

```json
{
  "mcpServers": {
    "monkbrowse": { "command": "npx", "args": ["-y", "monkbrowse"] }
  }
}
```

Restart Claude Desktop. (This is the one client that still needs the config file today.)

### Any other MCP client

Point it at this command. Every client understands it:

::: code-group

```bash [npx]
npx -y monkbrowse
```

```bash [bunx]
bunx monkbrowse
```

```bash [pnpm]
pnpm dlx monkbrowse
```

:::

## 2. Install the Chrome extension

monkbrowse drives your real Chrome, so it needs a small extension in the browser. Install it from the Chrome Web Store in one click, and it auto-updates:

<a href="https://chromewebstore.google.com/detail/monkbrowse/ilkfoegakbcdibloiddkcbnpgjkgjgmd"><img alt="Add monkbrowse to Chrome" src="https://img.shields.io/badge/Add%20to%20Chrome-monkbrowse-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" height="34"></a>

Then pin the monkbrowse icon so it is easy to reach.

::: info Listing in review
The Chrome Web Store listing is submitted and under review. The button above goes live the moment it is approved.
:::

## 3. Share a tab and go

1. Open the monkbrowse popup (the toolbar icon). The status dot turns green when your AI client is running.
2. Toggle **on** the tabs you want the AI to use. Each gets a number, like `#1`.
3. Tell the AI in plain language: *"On tab 1, summarize the page."*

That is it. The AI only ever sees the tabs you shared. See [Sharing tabs](/guide/sharing) for the details, and [Use cases](/guide/use-cases) for ideas.

## Troubleshooting

- **Popup says Offline.** Your AI client (and its monkbrowse server) is not running yet. Start it; the extension reconnects on its own.
- **The AI says it has no tabs.** Nothing is shared. Open the popup and toggle a tab on.
- **Running two Chrome profiles.** Give the second one its own port in the popup. See [Connections & profiles](/guide/connection).
