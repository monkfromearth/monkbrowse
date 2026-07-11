import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import {
  buildSnapshot,
  clickRef,
  evaluate,
  getText,
  pressKey,
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
    document.body.innerHTML = `<button>Go</button>`;
    let clicked = false;
    document.querySelector("button")!.addEventListener("click", () => (clicked = true));
    buildSnapshot(); // assigns e1 to the button + resets the ref map
    clickRef("e1");
    expect(clicked).toBe(true);
  });

  test("typeRef sets value and fires input", () => {
    document.body.innerHTML = `<input />`;
    const input = document.querySelector("input")!;
    let inputEvents = 0;
    input.addEventListener("input", () => inputEvents++);
    buildSnapshot();
    typeRef("e1", "hello");
    expect(input.value).toBe("hello");
    expect(inputEvents).toBeGreaterThan(0);
  });

  test("selectOptionRef selects by value", () => {
    document.body.innerHTML = `
      <select>
        <option value="a">A</option>
        <option value="b">B</option>
      </select>`;
    buildSnapshot();
    selectOptionRef("e1", ["b"]);
    const sel = document.querySelector("select")!;
    expect(sel.value).toBe("b");
  });

  test("pressKey dispatches a keydown", () => {
    let key = "";
    document.body.addEventListener("keydown", (e) => (key = (e as KeyboardEvent).key));
    pressKey("Enter");
    expect(key).toBe("Enter");
  });

  test("pressKey parses modifiers", () => {
    let ev: KeyboardEvent | null = null;
    document.body.addEventListener("keydown", (e) => (ev = e as KeyboardEvent));
    pressKey("Ctrl+Shift+A");
    expect(ev!.key).toBe("A");
    expect(ev!.ctrlKey).toBe(true);
    expect(ev!.shiftKey).toBe(true);
  });

  test("an unknown ref throws an actionable error", () => {
    expect(() => clickRef("nope")).toThrow(/not found/i);
  });
});

describe("reading helpers", () => {
  test("getText returns the whole-page text", () => {
    document.body.innerHTML = `<article><h1>Title</h1><p>Body text.</p></article>`;
    const all = getText();
    expect(all).toContain("Title");
    expect(all).toContain("Body text.");
  });

  test("evaluate runs an expression and returns a JSON-safe value", async () => {
    document.title = "Hello";
    await expect(evaluate("document.title")).resolves.toBe("Hello");
    await expect(evaluate("1 + 2")).resolves.toBe(3);
    await expect(evaluate("({a: [1,2], b: 'x'})")).resolves.toEqual({
      a: [1, 2],
      b: "x",
    });
  });
});
