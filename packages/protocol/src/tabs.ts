import { z } from "zod";

/** A single browser tab, as reported by an extension for one profile. */
export const TabInfoSchema = z.object({
  tabId: z.number(),
  url: z.string(),
  title: z.string(),
  active: z.boolean(),
  windowId: z.number(),
});

export type TabInfo = z.infer<typeof TabInfoSchema>;
