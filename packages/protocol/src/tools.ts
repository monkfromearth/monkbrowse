import { z } from "zod";

/**
 * AI-facing MCP tool definitions. Each tool exposes a name, description, and a
 * zod schema for its arguments. Interaction tools accept an optional
 * `{ profile, tabId }` target; when omitted the server routes to the focused
 * profile's active tab (see the server's addressing layer).
 */

export interface ToolDef<A extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  arguments: A;
}

function def<A extends z.ZodTypeAny>(
  name: string,
  description: string,
  args: A,
): ToolDef<A> {
  return { name, description, arguments: args };
}

/** Optional target: which profile + tab a tool acts on. */
const target = {
  profile: z
    .union([z.number(), z.string()])
    .optional()
    .describe(
      "Target profile: a port number (e.g. 9222) or a profileId. Omit to use the focused profile.",
    ),
  tabId: z
    .number()
    .optional()
    .describe(
      "Target tab id within the profile. Omit to act on the profile's active tab.",
    ),
};

/** Element addressing shared by DOM-interaction tools. */
const elementRef = {
  element: z
    .string()
    .describe("Human-readable description of the target element"),
  ref: z
    .string()
    .describe("Exact element reference (ref) taken from the page snapshot"),
};

export const NavigateTool = def(
  "browser_navigate",
  "Navigate a tab to a URL",
  z.object({ url: z.string().describe("The URL to navigate to"), ...target }),
);

export const GoBackTool = def(
  "browser_go_back",
  "Go back to the previous page",
  z.object({ ...target }),
);

export const GoForwardTool = def(
  "browser_go_forward",
  "Go forward to the next page",
  z.object({ ...target }),
);

export const SnapshotTool = def(
  "browser_snapshot",
  "Capture an accessibility snapshot of the current page (preferred over a screenshot for understanding structure)",
  z.object({ ...target }),
);

export const ClickTool = def(
  "browser_click",
  "Click an element on the page",
  z.object({ ...elementRef, ...target }),
);

export const HoverTool = def(
  "browser_hover",
  "Hover over an element on the page",
  z.object({ ...elementRef, ...target }),
);

export const TypeTool = def(
  "browser_type",
  "Type text into an editable element",
  z.object({
    ...elementRef,
    text: z.string().describe("The text to type"),
    submit: z
      .boolean()
      .optional()
      .describe("Press Enter after typing to submit"),
    ...target,
  }),
);

export const SelectOptionTool = def(
  "browser_select_option",
  "Select one or more options in a <select> element",
  z.object({
    ...elementRef,
    values: z
      .array(z.string())
      .describe("Option values to select"),
    ...target,
  }),
);

export const PressKeyTool = def(
  "browser_press_key",
  "Press a keyboard key",
  z.object({
    key: z
      .string()
      .describe("Key name (e.g. 'Enter', 'ArrowLeft', 'a')"),
    ...target,
  }),
);

export const WaitTool = def(
  "browser_wait",
  "Wait for a number of seconds",
  z.object({ time: z.number().describe("Seconds to wait") }),
);

export const GetConsoleLogsTool = def(
  "browser_get_console_logs",
  "Get the console logs from a tab",
  z.object({ ...target }),
);

export const ScreenshotTool = def(
  "browser_screenshot",
  "Take a screenshot of the current page",
  z.object({ ...target }),
);

export const DragTool = def(
  "browser_drag",
  "Drag one element onto another",
  z.object({
    startElement: z
      .string()
      .describe("Human-readable description of the element to drag"),
    startRef: z.string().describe("Ref of the element to drag"),
    endElement: z
      .string()
      .describe("Human-readable description of the drop target"),
    endRef: z.string().describe("Ref of the drop target"),
    ...target,
  }),
);

export const ListTabsTool = def(
  "browser_list_tabs",
  "List all open tabs across every connected Chrome profile, with composite ids ('<port>:<tabId>')",
  z.object({}),
);

export const SwitchTabTool = def(
  "browser_switch_tab",
  "Make a specific tab the active tab in its profile",
  z.object({
    tabId: z.number().describe("The tab id to activate"),
    profile: target.profile,
  }),
);

/** All tools the server exposes over MCP. Order defines list order. */
export const ALL_TOOLS = [
  NavigateTool,
  GoBackTool,
  GoForwardTool,
  SnapshotTool,
  ClickTool,
  HoverTool,
  TypeTool,
  SelectOptionTool,
  PressKeyTool,
  WaitTool,
  GetConsoleLogsTool,
  ScreenshotTool,
  ListTabsTool,
  SwitchTabTool,
] as const;
