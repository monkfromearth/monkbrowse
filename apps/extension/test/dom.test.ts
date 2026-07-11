import "./helpers/dom-env";

import { afterEach, describe, expect, test } from "bun:test";

import {
  buildSnapshot,
  clickRef,
  dragRefs,
  evaluate,
  getText,
  pressKey,
  selectOptionRef,
  typeRef,
  uploadToRef,
} from "../lib/dom";

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
    const { snapshot } = buildSnapshot();
    expect(snapshot).toContain("heading");
    expect(snapshot).toContain('link "More info"');
    expect(snapshot).toContain('button "Sign in"');
    expect(document.querySelector("span")!.hasAttribute("data-mcp-ref")).toBe(false);
    expect(document.querySelector("button")!.hasAttribute("data-mcp-ref")).toBe(true);
  });

  test("refs are re-numbered fresh each call", () => {
    document.body.innerHTML = `<button>A</button>`;
    buildSnapshot();
    const first = document.querySelector("button")!.getAttribute("data-mcp-ref");
    buildSnapshot();
    const second = document.querySelector("button")!.getAttribute("data-mcp-ref");
    expect(first).toBe("e1");
    expect(second).toBe("e1");
  });

  test("skips hidden elements", () => {
    document.body.innerHTML = `<button style="display:none">Hidden</button><button>Shown</button>`;
    const { snapshot } = buildSnapshot();
    expect(snapshot).toContain('"Shown"');
    expect(snapshot).not.toContain('"Hidden"');
  });

  test("treats contenteditable as interactive", () => {
    document.body.innerHTML = `<div contenteditable="true">Editable</div>`;
    expect(buildSnapshot().snapshot).toContain("[ref=");
  });

  test("pierces shadow DOM and resolves a shadow element", () => {
    document.body.innerHTML = `<div id="host"></div>`;
    const sr = document.getElementById("host")!.attachShadow({ mode: "open" });
    sr.innerHTML = `<button>Shadow Go</button>`;
    const { snapshot } = buildSnapshot();
    const m = snapshot.match(/button "Shadow Go" \[ref=(e\d+)\]/);
    expect(m).toBeTruthy();
    let clicked = false;
    sr.querySelector("button")!.addEventListener("click", () => (clicked = true));
    clickRef(m![1]!);
    expect(clicked).toBe(true);
  });

  test("descends into a same-origin iframe", () => {
    document.body.innerHTML = `<iframe srcdoc="<button>Inner Go</button>"></iframe>`;
    const { snapshot } = buildSnapshot();
    expect(snapshot).toContain("iframe");
    expect(snapshot).toContain('button "Inner Go"');
  });
});

describe("action helpers", () => {
  test("clickRef clicks the element from a snapshot ref", () => {
    document.body.innerHTML = `<button>Go</button>`;
    let clicked = false;
    document.querySelector("button")!.addEventListener("click", () => (clicked = true));
    buildSnapshot();
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
    document.body.innerHTML = `<select><option value="a">A</option><option value="b">B</option></select>`;
    buildSnapshot();
    selectOptionRef("e1", ["b"]);
    expect(document.querySelector("select")!.value).toBe("b");
  });

  test("pressKey dispatches keys and parses modifiers", () => {
    let ev: KeyboardEvent | null = null;
    document.body.addEventListener("keydown", (e) => (ev = e as KeyboardEvent));
    pressKey("Ctrl+Shift+A");
    expect(ev!.key).toBe("A");
    expect(ev!.ctrlKey).toBe(true);
    expect(ev!.shiftKey).toBe(true);
  });

  test("dragRefs fires dragstart on source and drop on target", () => {
    document.body.innerHTML = `<div data-mcp-ref="d1">A</div><div data-mcp-ref="d2">B</div>`;
    const [a, b] = Array.from(document.querySelectorAll("div"));
    const events: string[] = [];
    a!.addEventListener("dragstart", () => events.push("start"));
    b!.addEventListener("drop", () => events.push("drop"));
    dragRefs("d1", "d2");
    expect(events).toEqual(expect.arrayContaining(["start", "drop"]));
  });

  test("uploadToRef sets a file on a file input", () => {
    document.body.innerHTML = `<input type="file" data-mcp-ref="f1" />`;
    uploadToRef("f1", "a.txt", btoa("hello"));
    const input = document.querySelector("input") as HTMLInputElement;
    expect(input.files!.length).toBe(1);
    expect(input.files![0]!.name).toBe("a.txt");
  });

  test("uploadToRef rejects a non-file input", () => {
    document.body.innerHTML = `<input type="text" data-mcp-ref="t1" />`;
    expect(() => uploadToRef("t1", "a.txt", btoa("x"))).toThrow(/file input/i);
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

  test("evaluate returns JSON-safe values and awaits promises", async () => {
    document.title = "Hello";
    await expect(evaluate("document.title")).resolves.toBe("Hello");
    await expect(evaluate("1 + 2")).resolves.toBe(3);
    await expect(evaluate("({a:[1,2],b:'x'})")).resolves.toEqual({ a: [1, 2], b: "x" });
    await expect(evaluate("Promise.resolve(42)")).resolves.toBe(42);
  });
});
