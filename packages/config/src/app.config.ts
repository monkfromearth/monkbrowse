export const appConfig = {
  /** Server name advertised over MCP. */
  name: "monkbrowse",
  /** Public docs site (GitHub Pages project URL). One place to swap a domain. */
  docsUrl: "https://monkfromearth.github.io/monkbrowse",
  /** Source repo. */
  repoUrl: "https://github.com/monkfromearth/monkbrowse",
  /** Chrome Web Store listing. Swap to the /<ITEM_ID> URL once the listing is live. */
  webStoreUrl: "https://chromewebstore.google.com/detail/monkbrowse",
} as const;

export type AppConfig = typeof appConfig;

/** Build a docs page URL, e.g. docsPage("/guide/sharing"). */
export function docsPage(path: string): string {
  return `${appConfig.docsUrl}${path}`;
}
