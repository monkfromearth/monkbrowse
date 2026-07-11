import { defineContentScript } from "#imports";

import {
  buildSnapshot,
  clickRef,
  hoverRef,
  pressKeyGlobal,
  selectOptionRef,
  typeRef,
} from "../lib/dom";

/**
 * Runs in every page. Two jobs:
 *  1. Buffer console output (so browser_get_console_logs can return it).
 *  2. Execute DOM operations requested by the service worker (messages tagged
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
          pressKeyGlobal(msg.key as string);
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
