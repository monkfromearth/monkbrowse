import { describe, expect, test } from "bun:test";

import {
  ALL_TOOLS,
  ClickTool,
  HelloSchema,
  NavigateTool,
  messageTimeouts,
  retryableMessages,
  socketMessages,
} from "../src/index";
import { toolInputSchema } from "../src/json-schema";

describe("tool schemas", () => {
  test("click requires ref + element, allows optional target", () => {
    expect(
      ClickTool.arguments.parse({ ref: "e1", element: "Sign in" }),
    ).toMatchObject({ ref: "e1", element: "Sign in" });
    expect(
      ClickTool.arguments.parse({
        ref: "e1",
        element: "Sign in",
        profile: 9223,
        tabId: 5,
      }),
    ).toMatchObject({ profile: 9223, tabId: 5 });
    expect(() => ClickTool.arguments.parse({ element: "x" })).toThrow();
  });

  test("navigate requires url", () => {
    expect(NavigateTool.arguments.parse({ url: "https://x.com" })).toMatchObject(
      { url: "https://x.com" },
    );
    expect(() => NavigateTool.arguments.parse({})).toThrow();
  });

  test("all 14 tools have unique names", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(names.length).toBe(14);
    expect(new Set(names).size).toBe(14);
  });

  test("toolInputSchema yields JSON Schema with the tool's fields", () => {
    const schema = toolInputSchema(ClickTool) as {
      properties: Record<string, unknown>;
    };
    expect(Object.keys(schema.properties)).toEqual(
      expect.arrayContaining(["ref", "element", "profile", "tabId"]),
    );
  });
});

describe("wire messages", () => {
  test("browser_navigate request accepts url + optional tabId", () => {
    expect(
      socketMessages.browser_navigate.request.parse({ url: "https://x.com" }),
    ).toMatchObject({ url: "https://x.com" });
    expect(
      socketMessages.browser_navigate.request.parse({
        url: "https://x.com",
        tabId: 7,
      }),
    ).toMatchObject({ tabId: 7 });
    expect(() =>
      socketMessages.browser_navigate.request.parse({ tabId: 7 }),
    ).toThrow();
  });

  test("browser_snapshot response carries tabId + url + title + snapshot", () => {
    const r = socketMessages.browser_snapshot.response.parse({
      tabId: 3,
      url: "https://x.com",
      title: "X",
      snapshot: "- link [ref=e1]",
    });
    expect(r.tabId).toBe(3);
  });
});

describe("timeouts + retry policy", () => {
  test("navigation gets a long timeout", () => {
    expect(messageTimeouts.browser_navigate).toBe(60_000);
  });

  test("only idempotent reads are retryable", () => {
    expect(retryableMessages.has("browser_snapshot")).toBe(true);
    expect(retryableMessages.has("getUrl")).toBe(true);
    expect(retryableMessages.has("browser_click")).toBe(false);
    expect(retryableMessages.has("browser_type")).toBe(false);
    expect(retryableMessages.has("browser_navigate")).toBe(false);
  });
});

describe("handshake", () => {
  test("hello requires profileId, label, extVersion, tabs", () => {
    expect(
      HelloSchema.parse({
        profileId: "uuid",
        label: "Work",
        extVersion: "0.2.0",
        tabs: [],
      }),
    ).toMatchObject({ profileId: "uuid" });
    expect(() => HelloSchema.parse({ profileId: "uuid" })).toThrow();
  });
});
