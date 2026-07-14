export const appConfig = {
  /** Server name advertised over MCP. */
  name: "monkbrowse",
  /** Public docs site (GitHub Pages project URL). One place to swap a domain. */
  docsUrl: "https://monkfromearth.github.io/monkbrowse",
} as const;

export type AppConfig = typeof appConfig;

/** Build a docs page URL, e.g. docsPage("/guide/sharing"). */
export function docsPage(path: string): string {
  return `${appConfig.docsUrl}${path}`;
}
