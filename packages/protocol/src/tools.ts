import { z } from "zod";

/**
 * AI-facing MCP tool definitions. Each tool exposes a name, description, and a
 * zod schema for its arguments. Tab-scoped tools accept an optional
 * `{ profile, tab }` target; when omitted the server routes to the focused
 * profile's active shared tab (see the server's addressing layer).
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
      "Target profile: a port number (e.g. 9222) or its label. Omit to use the focused profile.",
    ),
  tab: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Tab number shown in the popup and browser_list_tabs (1, 2, 3…). Omit to act on the profile's active tab.",
    ),
};

/** Element addressing shared by DOM-interaction tools. */
const elementRef = {
  element: z
    .string()
    .describe("Human-readable description of the target element"),
  ref: z
    .string()
    .describe("Exact element reference (ref) taken from the latest snapshot"),
};

// --- Navigation ---

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

export const ReloadTool = def(
  "browser_reload",
  "Reload the page",
  z.object({ ...target }),
);

// --- Reading ---

export const SnapshotTool = def(
  "browser_snapshot",
  "Capture an accessibility snapshot of the page (includes shadow-DOM and same-origin iframe content). Preferred over a screenshot for understanding structure and getting element refs.",
  z.object({ ...target }),
);

export const GetTextTool = def(
  "browser_get_text",
  "Get the visible text of the page, or of one element — good for reading or summarizing content",
  z.object({
    ref: z
      .string()
      .optional()
      .describe("Element ref to read; omit for the whole page"),
    ...target,
  }),
);

export const ScreenshotTool = def(
  "browser_screenshot",
  "Take a screenshot of a tab (brings the tab to front first)",
  z.object({ ...target }),
);

export const GetConsoleLogsTool = def(
  "browser_get_console_logs",
  "Get the console logs from a tab",
  z.object({ ...target }),
);

export const EvaluateTool = def(
  "browser_evaluate",
  "Run a JavaScript expression in the page and return its result (JSON-serializable). Powerful escape hatch: read the DOM, cookies (document.cookie), localStorage, computed values, etc.",
  z.object({
    expression: z
      .string()
      .describe("A JavaScript expression, e.g. document.title"),
    ...target,
  }),
);

// --- Interacting ---

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
    values: z.array(z.string()).describe("Option values or labels to select"),
    ...target,
  }),
);

export const PressKeyTool = def(
  "browser_press_key",
  "Press a key or key combination (e.g. 'Enter', 'ArrowDown', 'Ctrl+A', 'Meta+c')",
  z.object({
    key: z.string().describe("Key or combo, modifiers joined with '+'"),
    ...target,
  }),
);

export const ScrollTool = def(
  "browser_scroll",
  "Scroll the page (to load lazy content) or scroll an element into view",
  z.object({
    direction: z
      .enum(["up", "down", "left", "right"])
      .optional()
      .describe("Direction to scroll the page; omit if using ref"),
    amount: z
      .number()
      .optional()
      .describe("Pixels to scroll (default: about one viewport)"),
    ref: z
      .string()
      .optional()
      .describe("Scroll this element into view instead of scrolling the page"),
    ...target,
  }),
);

export const DragTool = def(
  "browser_drag",
  "Drag one element onto another",
  z.object({
    startElement: z.string().describe("Description of the element to drag"),
    startRef: z.string().describe("Ref of the element to drag"),
    endElement: z.string().describe("Description of the drop target"),
    endRef: z.string().describe("Ref of the drop target"),
    ...target,
  }),
);

export const UploadFileTool = def(
  "browser_upload_file",
  "Set a local file on a file input (<input type=file>)",
  z.object({
    ref: z.string().describe("Ref of the file input element"),
    path: z.string().describe("Absolute path to the local file to upload"),
    ...target,
  }),
);

// --- Timing ---

export const WaitTool = def(
  "browser_wait",
  "Wait a number of seconds, or until some text appears on the page",
  z.object({
    time: z.number().optional().describe("Seconds to wait (default 1)"),
    text: z
      .string()
      .optional()
      .describe("Wait until this text appears in the page (up to ~15s)"),
    ...target,
  }),
);

// --- Tabs & profiles ---

export const ListTabsTool = def(
  "browser_list_tabs",
  "List the shared tabs across every connected profile, with their numbers",
  z.object({}),
);

export const SwitchTabTool = def(
  "browser_switch_tab",
  "Make a shared tab the active tab in its profile",
  z.object({
    tab: z.number().int().positive().describe("The tab number to activate"),
    profile: target.profile,
  }),
);

export const NewTabTool = def(
  "browser_new_tab",
  "Open a new tab (automatically shared with the AI) and return its number",
  z.object({
    url: z.string().optional().describe("URL to open; omit for a blank tab"),
    profile: target.profile,
  }),
);

export const CloseTabTool = def(
  "browser_close_tab",
  "Close a shared tab",
  z.object({
    tab: z.number().int().positive().describe("The tab number to close"),
    profile: target.profile,
  }),
);

/** All tools the server exposes over MCP. Order defines list order. */
export const ALL_TOOLS = [
  NavigateTool,
  GoBackTool,
  GoForwardTool,
  ReloadTool,
  SnapshotTool,
  GetTextTool,
  ScreenshotTool,
  GetConsoleLogsTool,
  EvaluateTool,
  ClickTool,
  HoverTool,
  TypeTool,
  SelectOptionTool,
  PressKeyTool,
  ScrollTool,
  DragTool,
  UploadFileTool,
  WaitTool,
  ListTabsTool,
  SwitchTabTool,
  NewTabTool,
  CloseTabTool,
] as const;
