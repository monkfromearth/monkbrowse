# Sharing tabs

The most important idea in monkbrowse: **the AI sees nothing by default.** It cannot list your tabs, read them, or act on them until you explicitly share a tab. This is the opposite of most automation tools, which get the whole browser at once.

## How sharing works

Open the monkbrowse popup (the toolbar icon). Every open tab in this Chrome profile is listed. Each row has a toggle:

- **Off** (default): the tab is invisible to the AI. It does not appear in `browser_list_tabs`, and no tool can act on it.
- **On**: the tab is shared. The AI can now read it and act on it.

Flip a tab on and it jumps to the **Shared** group at the top. Flip it off and it drops back down. Use **Share all** to toggle every tab at once.

## Tab numbers (#1, #2, ...)

Each shared tab gets a small stable number, like `#1` or `#2`. That number is how you talk to the AI about a specific tab in plain language:

> "On tab 1, click the login button."
>
> "Compare tab 2 and tab 3."

The number stays with the tab as long as it is shared, so you can refer back to it. Close a tab or unshare it and its number is freed for the next one.

## What the AI can do with a shared tab

Once a tab is shared, the assistant can use the full [tool set](/guide/tools) on it: read the page, click, type, scroll, navigate, take a screenshot, read console logs, and so on. It always tells you which tab it is acting on, and the popup shows a live indicator on that row while it works.

## What it cannot do

- It cannot touch an unshared tab. Unshared tabs are not even listed to the AI.
- It cannot silently share a tab for you. Sharing is a toggle only you control, in the popup.
- Unshare a tab at any time and the AI immediately loses access to it.

## A note on sensitive tabs

Because monkbrowse uses your logged-in session, a shared tab gives the AI whatever that tab can see, including account pages. Share a banking or email tab only when you actually want the AI working there, and unshare it when you are done. Think of the toggle like handing someone your screen for that one tab.

## Next

- [Connections & profiles](/guide/connection): how a Chrome profile connects, and running more than one.
- [Use cases](/guide/use-cases): concrete things people do with shared tabs.
