import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import {
  buildSnapshot,
  clickRef,
  pressKeyGlobal,
  selectOptionRef,
  typeRef,
} from "../lib/dom";

beforeAll(() => {
  // happy-dom has no layout engine — give every element a non-zero box so the
  // visibility filter in buildSnapshot lets elements through.
  Object.defineProperty(Element.prototype, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ width: 120, height: 24, top: 0, left: 0, right: 120, bottom: 24, x: 0, y: 0, toJSON() {} }),
  });
  // CSS.escape polyfill (refs are simple ids)
  if (!(globalThis as { CSS?: unknown }).CSS) {
    (globalThis as { CSS?: unknown }).CSS = { escape: (s: string) => s };
  }
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("buildSnapshot", () => {
  test("emits interactive elements with refs and stamps the DOM", () => {
    document.body.innerHTML = `
      <div>
        <h1>Welcome</h1>
        <a href="https://x.com">More info</a>
        <button>Sign in</button>
        <span>just text</span>
      </div>`;
    const { snapshot, url, title } = buildSnapshot();
    expect(snapshot).toContain("heading");
    expect(snapshot).toContain('link "More info"');
    expect(snapshot).toContain('button "Sign in"');
    expect(snapshot).toContain("[ref=e");
    // a bare <span> is not interactive -> not stamped
    expect(document.querySelector("span")!.hasAttribute("data-mcp-ref")).toBe(false);
    expect(document.querySelector("button")!.hasAttribute("data-mcp-ref")).toBe(true);
    expect(typeof url).toBe("string");
    expect(typeof title).toBe("string");
  });

  test("refs are re-numbered fresh each call", () => {
    document.body.innerHTML = `<button>A</button>`;
    buildSnapshot();
    const first = document.querySelector("button")!.getAttribute("data-mcp-ref");
    buildSnapshot();
    const second = document.querySelector("button")!.getAttribute("data-mcp-ref");
    expect(first).toBe("e1");
    expect(second).toBe("e1"); // reset, not e2
  });
});

describe("action helpers resolve by ref", () => {
  test("clickRef clicks the stamped element", () => {
    document.body.innerHTML = `<button data-mcp-ref="e1">Go</button>`;
    let clicked = false;
    document.querySelector("button")!.addEventListener("click", () => (clicked = true));
    clickRef("e1");
    expect(clicked).toBe(true);
  });

  test("typeRef sets value and fires input", () => {
    document.body.innerHTML = `<input data-mcp-ref="e1" />`;
    const input = document.querySelector("input")!;
    let inputEvents = 0;
    input.addEventListener("input", () => inputEvents++);
    typeRef("e1", "hello");
    expect(input.value).toBe("hello");
    expect(inputEvents).toBeGreaterThan(0);
  });

  test("selectOptionRef selects by value", () => {
    document.body.innerHTML = `
      <select data-mcp-ref="e1">
        <option value="a">A</option>
        <option value="b">B</option>
      </select>`;
    selectOptionRef("e1", ["b"]);
    const sel = document.querySelector("select")!;
    expect(sel.value).toBe("b");
  });

  test("pressKeyGlobal dispatches a keydown", () => {
    let key = "";
    document.body.addEventListener("keydown", (e) => (key = (e as KeyboardEvent).key));
    pressKeyGlobal("Enter");
    expect(key).toBe("Enter");
  });

  test("an unknown ref throws an actionable error", () => {
    expect(() => clickRef("nope")).toThrow(/not found/i);
  });
});
