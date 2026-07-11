/**
 * DOM logic that runs INSIDE the page (content-script context). No chrome APIs
 * here. Builds an accessibility snapshot that stamps each interesting element
 * with a stable `data-mcp-ref`, which the action helpers later resolve.
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

let refCounter = 0;

function roleOf(el: Element): string {
  const explicit = el.getAttribute("role");
  if (explicit) {
    return explicit;
  }
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
  if (aria) {
    return aria.trim();
  }
  const labelledby = el.getAttribute("aria-labelledby");
  if (labelledby) {
    const t = labelledby
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ")
      .trim();
    if (t) return t;
  }
  if (el instanceof HTMLImageElement && el.alt) {
    return el.alt.trim();
  }
  if (el instanceof HTMLInputElement) {
    if (el.placeholder) return el.placeholder.trim();
    if (el.value && (el.type === "submit" || el.type === "button")) {
      return el.value.trim();
    }
  }
  const text = (el as HTMLElement).innerText?.trim() ?? "";
  return (text.split("\n")[0] ?? "").slice(0, 120);
}

function isVisible(el: Element): boolean {
  const style = window.getComputedStyle(el as HTMLElement);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  ) {
    return false;
  }
  const rect = (el as HTMLElement).getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function interesting(el: Element, role: string, name: string): boolean {
  if (INTERACTIVE.has(el.tagName)) return true;
  if (el.hasAttribute("role")) return true;
  if (role === "heading") return true;
  if (
    ["navigation", "main", "banner", "contentinfo", "img"].includes(role) &&
    name
  ) {
    return true;
  }
  return false;
}

function walk(el: Element, depth: number, lines: string[]): void {
  for (const child of Array.from(el.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (!isVisible(child)) continue;
    const role = roleOf(child);
    const name = nameOf(child);
    let nextDepth = depth;
    if (interesting(child, role, name)) {
      const ref = `e${++refCounter}`;
      child.setAttribute("data-mcp-ref", ref);
      const namePart = name ? ` "${name.replace(/"/g, '\\"')}"` : "";
      lines.push(`${"  ".repeat(depth)}- ${role}${namePart} [ref=${ref}]`);
      nextDepth = depth + 1;
    }
    walk(child, nextDepth, lines);
  }
}

export function buildSnapshot(): {
  url: string;
  title: string;
  snapshot: string;
} {
  document
    .querySelectorAll("[data-mcp-ref]")
    .forEach((e) => e.removeAttribute("data-mcp-ref"));
  refCounter = 0;
  const lines: string[] = [];
  if (document.body) {
    walk(document.body, 0, lines);
  }
  return {
    url: location.href,
    title: document.title,
    snapshot: lines.join("\n") || "(no interactive elements found)",
  };
}

function resolve(ref: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(
    `[data-mcp-ref="${CSS.escape(ref)}"]`,
  );
  if (!el) {
    throw new Error(`Element ref "${ref}" not found — capture a fresh snapshot`);
  }
  return el;
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

export function pressKeyGlobal(key: string): void {
  const el = (document.activeElement as HTMLElement | null) ?? document.body;
  for (const type of ["keydown", "keypress", "keyup"]) {
    el.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
  }
}
