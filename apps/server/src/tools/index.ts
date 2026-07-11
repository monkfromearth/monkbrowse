import type {
  ImageContent,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

import {
  ClickTool,
  GetConsoleLogsTool,
  HoverTool,
  NavigateTool,
  PressKeyTool,
  ScreenshotTool,
  SelectOptionTool,
  SwitchTabTool,
  type TabInfo,
  TypeTool,
  WaitTool,
} from "@monkbrowse/protocol";
import { wait } from "@monkbrowse/utils";

import type { ConnectionRegistry, ProfileConnection } from "../registry";
import type { TargetQueueManager } from "../queue";
import { captureAriaSnapshot } from "./aria-snapshot";

export type ToolResult = {
  content: (TextContent | ImageContent)[];
  isError?: boolean;
};

export interface ToolContext {
  registry: ConnectionRegistry;
  queue: TargetQueueManager;
}

type Content = TextContent | ImageContent;

function ok(text: string, extra: Content[] = []): ToolResult {
  return { content: [{ type: "text", text }, ...extra] };
}

/** Resolve profile + tab slot -> real tabId, then run `fn` serialized per tab. */
async function onTab<T>(
  ctx: ToolContext,
  args: { profile?: number | string; tab?: number },
  fn: (conn: ProfileConnection, tabId?: number) => Promise<T>,
): Promise<T> {
  const conn = ctx.registry.resolveProfile(args.profile);
  let tabId: number;
  if (args.tab != null) {
    let resolved = ctx.registry.tabIdForSlot(conn, args.tab);
    if (resolved == null) {
      // The slot may be newer than our cache — refresh once and retry.
      await ctx.registry.refreshTabs(conn);
      resolved = ctx.registry.tabIdForSlot(conn, args.tab);
    }
    if (resolved == null) {
      throw new Error(
        `No shared tab numbered ${args.tab} in profile "${conn.label}". Share it in the monkbrowse popup, or run browser_list_tabs.`,
      );
    }
    tabId = resolved;
  } else {
    tabId = ctx.registry.defaultSharedTab(conn);
  }
  const key = `${conn.port}:${tabId}`;
  return ctx.queue.enqueue(key, () => fn(conn, tabId));
}

export type ToolHandler = (
  ctx: ToolContext,
  args: unknown,
) => Promise<ToolResult>;

// Argument types inferred from the shared zod schemas.
type NavigateArgs = z.infer<typeof NavigateTool.arguments>;
type ClickArgs = z.infer<typeof ClickTool.arguments>;
type HoverArgs = z.infer<typeof HoverTool.arguments>;
type TypeArgs = z.infer<typeof TypeTool.arguments>;
type SelectArgs = z.infer<typeof SelectOptionTool.arguments>;
type PressKeyArgs = z.infer<typeof PressKeyTool.arguments>;
type WaitArgs = z.infer<typeof WaitTool.arguments>;
type ConsoleArgs = z.infer<typeof GetConsoleLogsTool.arguments>;
type ScreenshotArgs = z.infer<typeof ScreenshotTool.arguments>;
type SwitchArgs = z.infer<typeof SwitchTabTool.arguments>;

/** name -> handler. Args are already zod-validated by the caller. */
export const toolHandlers: Record<string, ToolHandler> = {
  browser_navigate: (ctx, raw) => {
    const args = raw as NavigateArgs;
    return onTab(ctx, args, async (conn, tabId) => {
      const res = await ctx.registry.send(conn, "browser_navigate", {
        url: args.url,
        tabId,
      });
      const snap = await captureAriaSnapshot(ctx.registry, conn, res.tabId);
      return ok(`Navigated to ${args.url}`, snap.content);
    });
  },

  browser_go_back: (ctx, raw) => {
    const args = raw as NavigateArgs;
    return onTab(ctx, args, async (conn, tabId) => {
      const res = await ctx.registry.send(conn, "browser_go_back", { tabId });
      const snap = await captureAriaSnapshot(ctx.registry, conn, res.tabId);
      return ok("Navigated back", snap.content);
    });
  },

  browser_go_forward: (ctx, raw) => {
    const args = raw as NavigateArgs;
    return onTab(ctx, args, async (conn, tabId) => {
      const res = await ctx.registry.send(conn, "browser_go_forward", { tabId });
      const snap = await captureAriaSnapshot(ctx.registry, conn, res.tabId);
      return ok("Navigated forward", snap.content);
    });
  },

  browser_snapshot: (ctx, raw) => {
    const args = raw as { profile?: number | string; tab?: number };
    return onTab(ctx, args, async (conn, tabId) => {
      const snap = await captureAriaSnapshot(ctx.registry, conn, tabId);
      return { content: snap.content };
    });
  },

  browser_click: (ctx, raw) => {
    const args = raw as ClickArgs;
    return onTab(ctx, args, async (conn, tabId) => {
      const res = await ctx.registry.send(conn, "browser_click", {
        ref: args.ref,
        element: args.element,
        tabId,
      });
      const snap = await captureAriaSnapshot(ctx.registry, conn, res.tabId);
      return ok(`Clicked "${args.element}"`, snap.content);
    });
  },

  browser_hover: (ctx, raw) => {
    const args = raw as HoverArgs;
    return onTab(ctx, args, async (conn, tabId) => {
      const res = await ctx.registry.send(conn, "browser_hover", {
        ref: args.ref,
        element: args.element,
        tabId,
      });
      const snap = await captureAriaSnapshot(ctx.registry, conn, res.tabId);
      return ok(`Hovered over "${args.element}"`, snap.content);
    });
  },

  browser_type: (ctx, raw) => {
    const args = raw as TypeArgs;
    return onTab(ctx, args, async (conn, tabId) => {
      const res = await ctx.registry.send(conn, "browser_type", {
        ref: args.ref,
        element: args.element,
        text: args.text,
        submit: args.submit,
        tabId,
      });
      const snap = await captureAriaSnapshot(ctx.registry, conn, res.tabId);
      return ok(`Typed "${args.text}" into "${args.element}"`, snap.content);
    });
  },

  browser_select_option: (ctx, raw) => {
    const args = raw as SelectArgs;
    return onTab(ctx, args, async (conn, tabId) => {
      const res = await ctx.registry.send(conn, "browser_select_option", {
        ref: args.ref,
        element: args.element,
        values: args.values,
        tabId,
      });
      const snap = await captureAriaSnapshot(ctx.registry, conn, res.tabId);
      return ok(`Selected option in "${args.element}"`, snap.content);
    });
  },

  browser_press_key: (ctx, raw) => {
    const args = raw as PressKeyArgs;
    return onTab(ctx, args, async (conn, tabId) => {
      await ctx.registry.send(conn, "browser_press_key", {
        key: args.key,
        tabId,
      });
      return ok(`Pressed key ${args.key}`);
    });
  },

  browser_wait: async (_ctx, raw) => {
    const args = raw as WaitArgs;
    await wait(args.time * 1000);
    return ok(`Waited for ${args.time} seconds`);
  },

  browser_get_console_logs: (ctx, raw) => {
    const args = raw as ConsoleArgs;
    return onTab(ctx, args, async (conn, tabId) => {
      const res = await ctx.registry.send(conn, "browser_get_console_logs", {
        tabId,
      });
      const text = res.logs.map((l) => JSON.stringify(l)).join("\n");
      return ok(text || "(no console logs)");
    });
  },

  browser_screenshot: (ctx, raw) => {
    const args = raw as ScreenshotArgs;
    return onTab(ctx, args, async (conn, tabId) => {
      const res = await ctx.registry.send(conn, "browser_screenshot", { tabId });
      return {
        content: [
          { type: "image", data: res.data, mimeType: "image/png" },
        ],
      };
    });
  },

  browser_list_tabs: async (ctx) => {
    const conns = ctx.registry.listConnected();
    if (conns.length === 0) {
      return ok(
        "No browser profiles are connected. Open the Monkbrowse extension in a Chrome profile and click Connect.",
      );
    }
    const sections = await Promise.all(
      conns.map(async (conn) => {
        let tabs: TabInfo[];
        try {
          tabs = await ctx.registry.refreshTabs(conn);
        } catch {
          tabs = [...conn.tabs.values()];
        }
        tabs.sort((a, b) => a.slot - b.slot);
        const lines = tabs.map((t) => {
          const active = t.active ? "  ● active" : "";
          const host = hostOf(t.url);
          return `  ${t.slot}. ${t.title || "(untitled)"}${host ? ` — ${host}` : ""}${active}`;
        });
        const header = `${conn.label} (port ${conn.port}):`;
        const body = lines.length
          ? lines
          : ["  (no shared tabs — share one in the monkbrowse popup)"];
        return [header, ...body].join("\n");
      }),
    );
    const example = conns[0]!.port;
    return ok(
      `Only tabs shared in the monkbrowse popup are listed. Address a tab as { profile, tab } — e.g. { profile: ${example}, tab: 1 }.\n\n` +
        sections.join("\n\n"),
    );
  },

  browser_switch_tab: async (ctx, raw) => {
    const args = raw as SwitchArgs;
    const conn = ctx.registry.resolveProfile(args.profile);
    let tabId = ctx.registry.tabIdForSlot(conn, args.tab);
    if (tabId == null) {
      await ctx.registry.refreshTabs(conn);
      tabId = ctx.registry.tabIdForSlot(conn, args.tab);
    }
    if (tabId == null) {
      throw new Error(`No tab numbered ${args.tab} in profile "${conn.label}".`);
    }
    await ctx.registry.send(conn, "browser_switch_tab", { tabId });
    ctx.registry.markUsed(conn.port);
    return ok(`Switched to tab ${args.tab} in "${conn.label}"`);
  },
};

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}
