import { z } from "zod";

/** A single browser tab, as reported by an extension for one profile. */
export const TabInfoSchema = z.object({
  tabId: z.number(),
  /** Simple, stable per-profile number shown to the user ("tab 1", "tab 2"). */
  slot: z.number(),
  url: z.string(),
  title: z.string(),
  active: z.boolean(),
  windowId: z.number(),
});

export type TabInfo = z.infer<typeof TabInfoSchema>;
