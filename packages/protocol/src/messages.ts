import { z } from "zod";

import { TabInfoSchema } from "./tabs";

/**
 * Wire protocol between the server and one profile's extension.
 *
 * These are the request/response payloads carried inside the messaging
 * envelope (see @monkbrowse/messaging). Every tab-scoped request carries a
 * resolved `tabId?`; when omitted the extension acts on that profile's active
 * tab and echoes the resolved `tabId` back in the response.
 */

/** Result of a tab-mutating action: the tab it actually acted on. */
const ActionResult = z.object({ tabId: z.number() });

/** Optional resolved tab id threaded into a request. */
const withTab = { tabId: z.number().optional() };

export const socketMessages = {
  browser_navigate: {
    request: z.object({ url: z.string(), ...withTab }),
    response: ActionResult,
  },
  browser_go_back: {
    request: z.object({ ...withTab }),
    response: ActionResult,
  },
  browser_go_forward: {
    request: z.object({ ...withTab }),
    response: ActionResult,
  },
  browser_click: {
    request: z.object({ ref: z.string(), element: z.string(), ...withTab }),
    response: ActionResult,
  },
  browser_type: {
    request: z.object({
      ref: z.string(),
      element: z.string(),
      text: z.string(),
      submit: z.boolean().optional(),
      ...withTab,
    }),
    response: ActionResult,
  },
  browser_hover: {
    request: z.object({ ref: z.string(), element: z.string(), ...withTab }),
    response: ActionResult,
  },
  browser_select_option: {
    request: z.object({
      ref: z.string(),
      element: z.string(),
      values: z.array(z.string()),
      ...withTab,
    }),
    response: ActionResult,
  },
  browser_press_key: {
    request: z.object({ key: z.string(), ...withTab }),
    response: ActionResult,
  },
  browser_wait: {
    request: z.object({ time: z.number() }),
    response: z.object({}),
  },
  browser_get_console_logs: {
    request: z.object({ ...withTab }),
    response: z.object({ tabId: z.number(), logs: z.array(z.unknown()) }),
  },
  browser_screenshot: {
    request: z.object({ ...withTab }),
    response: z.object({ tabId: z.number(), data: z.string() }),
  },
  // Single round-trip that returns everything captureAriaSnapshot needs, so the
  // url/title/snapshot are guaranteed to be for the SAME resolved tab.
  browser_snapshot: {
    request: z.object({ ...withTab }),
    response: z.object({
      tabId: z.number(),
      url: z.string(),
      title: z.string(),
      snapshot: z.string(),
    }),
  },
  getUrl: {
    request: z.object({ ...withTab }),
    response: z.object({ tabId: z.number(), url: z.string() }),
  },
  getTitle: {
    request: z.object({ ...withTab }),
    response: z.object({ tabId: z.number(), title: z.string() }),
  },
  list_tabs: {
    request: z.object({}),
    response: z.object({ tabs: z.array(TabInfoSchema) }),
  },
  browser_switch_tab: {
    request: z.object({ tabId: z.number() }),
    response: z.object({ activeTabId: z.number() }),
  },
  browser_reload: {
    request: z.object({ ...withTab }),
    response: ActionResult,
  },
  browser_scroll: {
    request: z.object({
      direction: z.enum(["up", "down", "left", "right"]).optional(),
      amount: z.number().optional(),
      ref: z.string().optional(),
      ...withTab,
    }),
    response: ActionResult,
  },
  browser_get_text: {
    request: z.object({ ref: z.string().optional(), ...withTab }),
    response: z.object({ tabId: z.number(), text: z.string() }),
  },
  browser_evaluate: {
    request: z.object({ expression: z.string(), ...withTab }),
    response: z.object({ tabId: z.number(), result: z.unknown() }),
  },
  browser_drag: {
    request: z.object({
      startRef: z.string(),
      endRef: z.string(),
      ...withTab,
    }),
    response: ActionResult,
  },
  browser_upload_file: {
    request: z.object({
      ref: z.string(),
      name: z.string(),
      data: z.string(), // base64
      ...withTab,
    }),
    response: ActionResult,
  },
  browser_new_tab: {
    request: z.object({ url: z.string().optional() }),
    response: z.object({ tabId: z.number(), slot: z.number() }),
  },
  browser_close_tab: {
    request: z.object({ tabId: z.number() }),
    response: z.object({ tabId: z.number() }),
  },
} as const;

export type SocketMessages = typeof socketMessages;
export type MessageType = keyof SocketMessages;

export type RequestOf<T extends MessageType> = z.infer<
  SocketMessages[T]["request"]
>;
export type ResponseOf<T extends MessageType> = z.infer<
  SocketMessages[T]["response"]
>;

/**
 * Per-message-type request timeouts (ms). Types not listed use the default.
 * Navigation and waits are slow; screenshots are quick.
 */
export const messageTimeouts: Partial<Record<MessageType, number>> = {
  browser_navigate: 60_000,
  browser_go_back: 60_000,
  browser_go_forward: 60_000,
  browser_reload: 60_000,
  browser_new_tab: 60_000,
  browser_wait: 65_000,
  browser_screenshot: 15_000,
};

/**
 * Idempotent reads are safe to retry after a timeout; side-effecting actions
 * (click/type/navigate/…) are NOT — retrying could double-act.
 */
export const retryableMessages: ReadonlySet<MessageType> = new Set([
  "browser_snapshot",
  "browser_get_text",
  "getUrl",
  "getTitle",
  "list_tabs",
]);
