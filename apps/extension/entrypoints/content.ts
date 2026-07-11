import { defineContentScript } from "#imports";

import {
  buildSnapshot,
  clickRef,
  dragRefs,
  evaluate,
  getText,
  hoverRef,
  pressKey,
  scrollPage,
  selectOptionRef,
  typeRef,
  uploadToRef,
} from "../lib/dom";

/**
 * Runs in every page. Jobs:
 *  1. Buffer console output (browser_get_console_logs).
 *  2. Keep native dialogs (alert/confirm/prompt) from blocking automation.
 *  3. Execute DOM operations requested by the service worker (messages tagged
 *     `cs: true`), resolving elements by the refs from the last snapshot.
 */
export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  allFrames: false,
  main() {
    const MAX_LOGS = 500;
    const logs: { level: string; ts: number; text: string }[] = [];

    const levels = ["log", "info", "warn", "error", "debug"] as const;
    for (const level of levels) {
      const orig = console[level].bind(console);
      console[level] = (...args: unknown[]) => {
        logs.push({ level, ts: Date.now(), text: args.map(safeString).join(" ") });
        if (logs.length > MAX_LOGS) logs.shift();
        orig(...args);
      };
    }

    // Non-blocking dialogs: a native alert/confirm/prompt would freeze the tab
    // and stall automation. Auto-resolve them (and log it) so flows continue.
    try {
      window.alert = (m?: unknown) =>
        logs.push({ level: "dialog", ts: Date.now(), text: `alert: ${String(m ?? "")}` });
      window.confirm = (m?: unknown) => {
        logs.push({ level: "dialog", ts: Date.now(), text: `confirm: ${String(m ?? "")}` });
        return true;
      };
      window.prompt = (m?: unknown, d?: string) => {
        logs.push({ level: "dialog", ts: Date.now(), text: `prompt: ${String(m ?? "")}` });
        return d ?? "";
      };
    } catch {
      // some pages freeze these; ignore
    }

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg || msg.cs !== true) {
        return undefined; // not for the content script
      }
      handle(msg)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true; // async response
    });

    async function handle(msg: { kind: string; [k: string]: unknown }) {
      switch (msg.kind) {
        case "ping":
          return "pong";
        case "snapshot":
          return buildSnapshot();
        case "click":
          clickRef(msg.ref as string);
          return {};
        case "hover":
          hoverRef(msg.ref as string);
          return {};
        case "type":
          typeRef(msg.ref as string, msg.text as string, msg.submit as boolean);
          return {};
        case "select_option":
          selectOptionRef(msg.ref as string, msg.values as string[]);
          return {};
        case "press_key":
          pressKey(msg.key as string);
          return {};
        case "scroll":
          scrollPage(
            msg.direction as "up" | "down" | "left" | "right" | undefined,
            msg.amount as number | undefined,
            msg.ref as string | undefined,
          );
          return {};
        case "get_text":
          return { text: getText(msg.ref as string | undefined) };
        case "evaluate":
          return { result: await evaluate(msg.expression as string) };
        case "drag":
          dragRefs(msg.startRef as string, msg.endRef as string);
          return {};
        case "upload":
          uploadToRef(msg.ref as string, msg.name as string, msg.data as string);
          return {};
        case "console":
          return logs.slice();
        default:
          throw new Error(`Unknown content op "${msg.kind}"`);
      }
    }
  },
});

function safeString(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
