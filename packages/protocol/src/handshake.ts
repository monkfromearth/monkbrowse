import { z } from "zod";

import { TabInfoSchema } from "./tabs";

/**
 * Control messages that are initiated by the EXTENSION rather than the server.
 * `hello` is a request (server replies with `hello_ack`); `tabs_changed` is a
 * fire-and-forget notification.
 */

export const HelloSchema = z.object({
  /** Stable per-profile uuid, persisted in chrome.storage.local. */
  profileId: z.string(),
  /** Friendly label chosen in the options UI. */
  label: z.string(),
  /** Cosmetic Chrome profile name, best-effort. */
  chromeProfileName: z.string().optional(),
  /** Extension version. */
  extVersion: z.string(),
  /** Initial tab enumeration so browser_list_tabs works immediately. */
  tabs: z.array(TabInfoSchema),
});
export type Hello = z.infer<typeof HelloSchema>;

export const HelloAckSchema = z.object({
  ok: z.boolean(),
  assignedPort: z.number(),
  serverVersion: z.string(),
  /** Present when ok=false: why the connection was rejected. */
  reason: z.string().optional(),
});
export type HelloAck = z.infer<typeof HelloAckSchema>;

export const TabsChangedSchema = z.object({
  tabs: z.array(TabInfoSchema),
});
export type TabsChanged = z.infer<typeof TabsChangedSchema>;

/** Reserved request/notify type names used on the wire. */
export const CONTROL = {
  hello: "hello",
  tabsChanged: "tabs_changed",
} as const;
