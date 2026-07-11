/**
 * Logs to stderr. stdout is the MCP stdio transport, so anything written there
 * would corrupt the protocol.
 */
export const debugLog: typeof console.error = (...args) => {
  console.error(...args);
};
