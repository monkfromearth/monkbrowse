/**
 * DOM logic that runs INSIDE the page (content-script context). No chrome APIs.
 *
 * The snapshot walks the light DOM, pierces **shadow roots**, and descends into
 * **same-origin iframes**, assigning each interesting element a ref. Refs are
 * kept in a live `refMap` (not just a data attribute) so they resolve reliably
 * even for shadow-DOM elements that `querySelector` can't reach.
 */

const INTERACTIVE = new Set([
  "A",
  "BUTTON",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "OPTION",
  "SUMMARY",
]);

let refMap = new Map<string, Element>();
let refCounter = 0;

function viewOf(el: Element): Window {
  return el.ownerDocument.defaultView ?? window;
}

function roleOf(el: Element): string {
  const explicit = el.getAttribute("role");
  if (explicit) return explicit;
  const tag = el.tagName.toLowerCase();
  switch (tag) {
    case "a":
      return (el as HTMLAnchorElement).href ? "link" : "generic";
    case "button":
      return "button";
    case "input": {
      const t = (el as HTMLInputElement).type;
      if (t === "checkbox") return "checkbox";
      if (t === "radio") return "radio";
      if (t === "submit" || t === "button") return "button";
      if (t === "file") return "file-input";
      return "textbox";
    }
    case "textarea":
      return "textbox";
    case "select":
      return "combobox";
    case "img":
      return "img";
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return "heading";
    case "nav":
      return "navigation";
    case "main":
      return "main";
    case "header":
      return "banner";
    case "footer":
      return "contentinfo";
    default:
      return "generic";
  }
}

function nameOf(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();
  const labelledby = el.getAttribute("aria-labelledby");
  if (labelledby) {
    const t = labelledby
      .split(/\s+/)
      .map((id) => el.ownerDocument.getElementById(id)?.textContent ?? "")
      .join(" ")
      .trim();
    if (t) return t;
  }
  if (el instanceof HTMLImageElement && el.alt) return el.alt.trim();
  if (el instanceof HTMLInputElement) {
    if (el.placeholder) return el.placeholder.trim();
    if (el.value && (el.type === "submit" || el.type === "button")) {
      return el.value.trim();
    }
  }
  const text = ((el as HTMLElement).innerText ?? el.textContent ?? "").trim();
  return (text.split("\n")[0] ?? "").slice(0, 120);
}

function isVisible(el: Element): boolean {
  try {
    const style = viewOf(el).getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false;
    }
  } catch {
    // cross-document getComputedStyle can throw; fall through to the box check
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function interesting(el: Element, role: string, name: string): boolean {
  if (INTERACTIVE.has(el.tagName)) return true;
  if (el.hasAttribute("role")) return true;
  if (el.getAttribute("contenteditable") === "true") return true;
  if (role === "heading") return true;
  if (
    ["navigation", "main", "banner", "contentinfo", "img"].includes(role) &&
    name
  ) {
    return true;
  }
  return false;
}

function indent(depth: number): string {
  return "  ".repeat(depth);
}

function walk(node: ParentNode, depth: number, lines: string[]): void {
  for (const child of Array.from(node.children)) {
    if (isVisible(child) === false) continue;
    const role = roleOf(child);
    const name = nameOf(child);
    let next = depth;
    if (interesting(child, role, name)) {
      const ref = `e${++refCounter}`;
      refMap.set(ref, child);
      child.setAttribute("data-mcp-ref", ref);
      const namePart = name ? ` "${name.replace(/"/g, '\\"')}"` : "";
      lines.push(`${indent(depth)}- ${role}${namePart} [ref=${ref}]`);
      next = depth + 1;
    }

    walk(child, next, lines);

    const shadow = (child as Element & { shadowRoot?: ShadowRoot | null })
      .shadowRoot;
    if (shadow) walk(shadow, next, lines);

    if (child instanceof HTMLIFrameElement) {
      let idoc: Document | null = null;
      try {
        idoc = child.contentDocument;
      } catch {
        idoc = null;
      }
      if (idoc?.body) {
        lines.push(`${indent(next)}- iframe`);
        walk(idoc.body, next + 1, lines);
      } else {
        lines.push(`${indent(next)}- iframe (cross-origin — not accessible)`);
      }
    }
  }
}

export function buildSnapshot(): {
  url: string;
  title: string;
  snapshot: string;
} {
  refMap = new Map();
  refCounter = 0;
  const lines: string[] = [];
  if (document.body) walk(document.body, 0, lines);
  return {
    url: location.href,
    title: document.title,
    snapshot: lines.join("\n") || "(no interactive elements found)",
  };
}

function resolve(ref: string): HTMLElement {
  const fromMap = refMap.get(ref);
  if (fromMap) return fromMap as HTMLElement;
  // Light-DOM fallback (e.g. after a content-script reload): the ref map is
  // gone but the stamped attribute may still be on the element.
  const q = document.querySelector<HTMLElement>(
    `[data-mcp-ref="${CSS.escape(ref)}"]`,
  );
  if (q) return q;
  throw new Error(`Element ref "${ref}" not found — capture a fresh snapshot`);
}

export function clickRef(ref: string): void {
  const el = resolve(ref);
  el.scrollIntoView({ block: "center", inline: "center" });
  el.click();
}

export function hoverRef(ref: string): void {
  const el = resolve(ref);
  el.scrollIntoView({ block: "center", inline: "center" });
  el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
}

export function typeRef(ref: string, text: string, submit?: boolean): void {
  const el = resolve(ref);
  el.scrollIntoView({ block: "center", inline: "center" });
  el.focus();
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const proto = Object.getPrototypeOf(el) as object;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter?.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (el.isContentEditable) {
    el.textContent = text;
    el.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }
  if (submit) {
    el.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    (el as HTMLInputElement).form?.requestSubmit?.();
  }
}

export function selectOptionRef(ref: string, values: string[]): void {
  const el = resolve(ref);
  if (!(el instanceof HTMLSelectElement)) {
    throw new Error("Element is not a <select>");
  }
  for (const opt of Array.from(el.options)) {
    opt.selected = values.includes(opt.value) || values.includes(opt.label);
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

const MODIFIERS: Record<string, "ctrlKey" | "metaKey" | "altKey" | "shiftKey"> =
  {
    ctrl: "ctrlKey",
    control: "ctrlKey",
    meta: "metaKey",
    cmd: "metaKey",
    command: "metaKey",
    alt: "altKey",
    option: "altKey",
    shift: "shiftKey",
  };

export function pressKey(combo: string): void {
  const parts = combo.split("+").map((p) => p.trim());
  const key = parts.pop() ?? "";
  const init: KeyboardEventInit = { key, bubbles: true, cancelable: true };
  for (const part of parts) {
    const mod = MODIFIERS[part.toLowerCase()];
    if (mod) init[mod] = true;
  }
  const el = (document.activeElement as HTMLElement | null) ?? document.body;
  el.dispatchEvent(new KeyboardEvent("keydown", init));
  el.dispatchEvent(new KeyboardEvent("keyup", init));
}

export function scrollPage(
  direction?: "up" | "down" | "left" | "right",
  amount?: number,
  ref?: string,
): void {
  if (ref) {
    resolve(ref).scrollIntoView({ block: "center", inline: "center" });
    return;
  }
  const step = amount ?? Math.round(window.innerHeight * 0.9);
  const delta: Record<string, [number, number]> = {
    down: [0, step],
    up: [0, -step],
    right: [step, 0],
    left: [-step, 0],
  };
  const [x, y] = delta[direction ?? "down"]!;
  window.scrollBy(x, y);
}

export function getText(ref?: string): string {
  const el = ref ? resolve(ref) : document.body;
  return ((el as HTMLElement).innerText ?? el.textContent ?? "").trim();
}

export async function evaluate(expression: string): Promise<unknown> {
  // Intentional: browser_evaluate is a deliberate "run JS" escape hatch (like
  // Playwright's page.evaluate). The expression comes from the user's own AI and
  // only ever runs inside a tab the user explicitly shared — not third-party input.
  const fn = new Function(`return (${expression})`);
  const raw = fn();
  const value =
    raw && typeof (raw as { then?: unknown }).then === "function"
      ? await raw
      : raw;
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch {
    return String(value);
  }
}

export function dragRefs(startRef: string, endRef: string): void {
  const src = resolve(startRef);
  const tgt = resolve(endRef);
  const dataTransfer = new DataTransfer();
  const fire = (el: Element, type: string) =>
    el.dispatchEvent(
      new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer }),
    );
  fire(src, "dragstart");
  fire(tgt, "dragenter");
  fire(tgt, "dragover");
  fire(tgt, "drop");
  fire(src, "dragend");
}

export function uploadToRef(ref: string, name: string, base64: string): void {
  const el = resolve(ref);
  if (!(el instanceof HTMLInputElement) || el.type !== "file") {
    throw new Error("Element is not a file input");
  }
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const file = new File([bytes], name);
  const dt = new DataTransfer();
  dt.items.add(file);
  el.files = dt.files;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}
