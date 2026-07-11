export const appConfig = {
  /** Server name advertised over MCP. */
  name: "monkbrowse",
} as const;

export type AppConfig = typeof appConfig;
