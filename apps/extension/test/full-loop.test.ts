import "./helpers/dom-env";

import { beforeEach, describe, expect, test } from "bun:test";

import { Peer } from "@monkbrowse/messaging";
import type { Hello } from "@monkbrowse/protocol";

// Real SERVER code (imported across the workspace; no ws needed on this path).
import { TargetQueueManager } from "../../server/src/queue";
import { ConnectionRegistry } from "../../server/src/registry";
import { type ToolContext, toolHandlers } from "../../server/src/tools";

// Real EXTENSION code.
import { createLogBuffer, handleContentOp } from "../lib/content-ops";
import { execWire } from "../lib/executor";
import { __resetCache, setShared } from "../lib/shares";
import { enumerateSharedTabs } from "../lib/tabs";
import { type FakeChromeHandle, installFakeChrome } from "./helpers/fake-chrome";
import { linkedSockets } from "./helpers/linked-peers";

/**
 * End-to-end WITHOUT Chrome: a real MCP tool handler → real registry → real
 * messaging Peer (linked in memory) → real extension execWire → real DOM engine
 * → a headless DOM. Proves the whole pipeline manipulates real elements.
 */
const PORT = 9222;
const buffer = createLogBuffer();
let chrome: FakeChromeHandle;

async function connectLoop(): Promise<ToolContext> {
  const registry = new ConnectionRegistry([PORT], "test");
  const ctx: ToolContext = { registry, queue: new TargetQueueManager() };

  const [serverSide, extSide] = linkedSockets();
  const serverPeer = new Peer(serverSide);
  // The extension answers every wire request by running the real execWire.
  new Peer(extSide, {
    onRequest: (type, payload) =>
      execWire(type, (payload as Record<string, unknown>) ?? {}),
  });

  const tab = chrome.addTab({
    id: 100,
    title: "Loop",
    url: "https://loop.example",
    active: true,
  });
  await setShared(tab.id, true);
  const tabs = await enumerateSharedTabs();
  const hello: Hello = {
    profileId: "p",
    label: "Loop",
    extVersion: "0",
    tabs,
  };
  const ack = registry.handleHello(PORT, serverPeer, hello);
  expect(ack.ok).toBe(true);
  return ctx;
}

function textOf(r: { content: { text?: string }[] }): string {
  return r.content.map((c) => c.text ?? "").join("\n");
}

beforeEach(() => {
  chrome = installFakeChrome((_id, msg) => handleContentOp(msg, buffer.logs));
  __resetCache();
  document.body.innerHTML = "";
});

describe("full loop: MCP tool → server → messaging → executor → DOM", () => {
  test("snapshot reflects the real page", async () => {
    document.body.innerHTML = `<h1>Loop Page</h1><button>Do it</button>`;
    const ctx = await connectLoop();
    const out = textOf(await toolHandlers.browser_snapshot!(ctx, { profile: PORT }));
    expect(out).toContain("Loop Page");
    expect(out).toContain('button "Do it"');
    // (URL comes from the page's location.href, which is about:blank under happy-dom)
  });

  test("a click tool call actually clicks the element", async () => {
    document.body.innerHTML = `<button>Submit</button>`;
    let clicked = false;
    document.querySelector("button")!.addEventListener("click", () => (clicked = true));
    const ctx = await connectLoop();

    // find the ref the snapshot assigned
    const snap = textOf(await toolHandlers.browser_snapshot!(ctx, { profile: PORT }));
    const ref = snap.match(/\[ref=(e\d+)\]/)![1]!;
    await toolHandlers.browser_click!(ctx, {
      profile: PORT,
      tab: 1,
      ref,
      element: "Submit",
    });
    expect(clicked).toBe(true);
  });

  test("type fills a real input", async () => {
    document.body.innerHTML = `<input />`;
    const ctx = await connectLoop();
    const snap = textOf(await toolHandlers.browser_snapshot!(ctx, { profile: PORT }));
    const ref = snap.match(/\[ref=(e\d+)\]/)![1]!;
    await toolHandlers.browser_type!(ctx, {
      profile: PORT,
      ref,
      element: "field",
      text: "hello world",
    });
    expect(document.querySelector("input")!.value).toBe("hello world");
  });

  test("navigate updates the real tab", async () => {
    const ctx = await connectLoop();
    await toolHandlers.browser_navigate!(ctx, {
      profile: PORT,
      url: "https://elsewhere.example",
    });
    expect(chrome.tabs.find((t) => t.id === 100)!.url).toBe(
      "https://elsewhere.example",
    );
  });

  test("evaluate returns a computed value through the whole stack", async () => {
    document.body.innerHTML = `<div id="n">21</div>`;
    const ctx = await connectLoop();
    const out = textOf(
      await toolHandlers.browser_evaluate!(ctx, {
        profile: PORT,
        expression: "Number(document.getElementById('n').textContent) * 2",
      }),
    );
    expect(out).toContain("42");
  });

  test("list_tabs aggregates the shared tab with its number", async () => {
    const ctx = await connectLoop();
    const out = textOf(await toolHandlers.browser_list_tabs!(ctx, {}));
    expect(out).toContain("Loop");
    expect(out).toContain("1.");
  });
});
