# Connections & profiles

monkbrowse has two halves that talk to each other on your own machine:

- The **server** runs alongside your AI client (Claude, Cursor, and so on). It speaks the AI's protocol on one side and listens for browser connections on the other.
- The **extension** runs inside Chrome. It opens a local connection to the server and carries out what the AI asks.

Everything is local. The connection never leaves `127.0.0.1` (your own computer).

## Why a "port"

The server can talk to several Chrome profiles at once. To keep them apart, each profile connects on its own numbered channel, called a **port** (9222, 9223, 9224, ...). Think of ports like phone extensions in one office: one building (the server), many extensions (the profiles).

You almost never need to touch this. A single Chrome profile just uses the default port and connects on its own. The popup's status dot turns green when it is linked.

## Why a "profile name"

If you run more than one Chrome profile, a name (like **Work** or **Personal**) makes it obvious which one you are looking at, both in the popup and when the AI lists what it is connected to. It is purely a friendly label. If you leave it blank, monkbrowse just shows `Chrome (9222)` using the port.

## Running more than one profile

This is the reason ports and names exist, and the thing most tools cannot do:

1. In your first Chrome profile, leave the port at the default (9222) and connect.
2. In your second profile, open the popup, set the port to **9223**, give it a name, and save.
3. The one server now holds both. A second profile never kicks the first one off.

Now a single AI session can drive both profiles at the same time, and address them separately. See the multi-profile examples in [Use cases](/guide/use-cases).

Rule of thumb: **one port per profile.** Two profiles on the same port would collide, so give each its own.

## Reading the connection status

The popup header shows the state:

- **Connected** (green): the extension is linked to the server and ready.
- **Offline** (grey): no link yet. Usually this means your AI client (and its monkbrowse server) is not running. Start it, and the extension reconnects on its own.

The connection survives Chrome putting the extension to sleep, and it reconnects automatically after a drop, so you should rarely have to think about it.

## When to change the port

Only when you want a second (or third) profile connected at the same time. For a single everyday Chrome, the defaults are correct and you can ignore this whole panel.

## Next

- [Sharing tabs](/guide/sharing): choosing what the AI can actually touch.
- [Architecture](/guide/architecture): how the pieces fit under the hood.
