import "./helpers/dom-env";

import { beforeEach, describe, expect, test } from "bun:test";

import { createLogBuffer, handleContentOp } from "../lib/content-ops";
import { execWire } from "../lib/executor";
import { __resetCache, isShared, setShared } from "../lib/shares";
import { type FakeChromeHandle, installFakeChrome } from "./helpers/fake-chrome";

const buffer = createLogBuffer();
let chrome: FakeChromeHandle;

beforeEach(() => {
  chrome = installFakeChrome((_tabId, msg) => handleContentOp(msg, buffer.logs));
  __resetCache();
  document.body.innerHTML = "";
});

describe("execWire — tab operations", () => {
  test("navigate updates the tab's url (shared)", async () => {
    const tab = chrome.addTab({ active: true });
    await setShared(tab.id, true);
    const res = (await execWire("browser_navigate", {
      url: "https://new.example",
      tabId: tab.id,
    })) as { tabId: number };
    expect(res.tabId).toBe(tab.id);
    expect(chrome.tabs.find((t) => t.id === tab.id)!.url).toBe(
      "https://new.example",
    );
  });

  test("refuses an unshared tab", async () => {
    chrome.addTab({ active: true }); // not shared
    await expect(execWire("browser_snapshot", {})).rejects.toThrow(
      /isn't shared/i,
    );
  });

  test("new_tab creates and auto-shares a tab", async () => {
    const res = (await execWire("browser_new_tab", {
      url: "https://opened.example",
    })) as { tabId: number; slot: number };
    expect(chrome.tabs.some((t) => t.id === res.tabId)).toBe(true);
    expect(res.slot).toBeGreaterThanOrEqual(1);
    expect(await isShared(res.tabId)).toBe(true);
  });

  test("close_tab unshares and removes it", async () => {
    const tab = chrome.addTab({ active: true });
    await setShared(tab.id, true);
    await execWire("browser_close_tab", { tabId: tab.id });
    expect(chrome.tabs.some((t) => t.id === tab.id)).toBe(false);
    expect(await isShared(tab.id)).toBe(false);
  });

  test("screenshot brings a background target tab to front first", async () => {
    const bg = chrome.addTab({ id: 200, active: false });
    chrome.addTab({ id: 201, active: true });
    await setShared(bg.id, true);
    await execWire("browser_screenshot", { tabId: bg.id });
    expect(chrome.tabs.find((t) => t.id === 200)!.active).toBe(true);
    expect(chrome.screenshots).toBe(1);
  });

  test("list_tabs returns only shared tabs with numbers", async () => {
    const a = chrome.addTab({ id: 300, title: "A", active: true });
    chrome.addTab({ id: 301, title: "B" });
    await setShared(a.id, true); // only A shared
    const res = (await execWire("list_tabs", {})) as {
      tabs: { tabId: number; slot: number }[];
    };
    expect(res.tabs.map((t) => t.tabId)).toEqual([300]);
    expect(res.tabs[0]!.slot).toBe(1);
  });
});

describe("execWire — DOM ops via the content script", () => {
  test("snapshot then click drives a real element", async () => {
    const tab = chrome.addTab({ active: true });
    await setShared(tab.id, true);
    document.body.innerHTML = `<button>Press me</button>`;
    let clicked = false;
    document.querySelector("button")!.addEventListener("click", () => (clicked = true));

    const snap = (await execWire("browser_snapshot", { tabId: tab.id })) as {
      snapshot: string;
    };
    const ref = snap.snapshot.match(/\[ref=(e\d+)\]/)![1]!;
    await execWire("browser_click", { ref, tabId: tab.id, element: "button" });
    expect(clicked).toBe(true);
  });

  test("get_text reads the page", async () => {
    const tab = chrome.addTab({ active: true });
    await setShared(tab.id, true);
    document.body.innerHTML = `<p>Readable content</p>`;
    const res = (await execWire("browser_get_text", { tabId: tab.id })) as {
      text: string;
    };
    expect(res.text).toContain("Readable content");
  });

  test("evaluate runs JS in the page", async () => {
    const tab = chrome.addTab({ active: true });
    await setShared(tab.id, true);
    const res = (await execWire("browser_evaluate", {
      expression: "6 * 7",
      tabId: tab.id,
    })) as { result: unknown };
    expect(res.result).toBe(42);
  });
});
