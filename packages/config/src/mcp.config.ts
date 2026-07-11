/**
 * Runtime configuration shared by the server and the extension.
 *
 * Port model: ONE PORT PER PROFILE. The server binds a contiguous range of
 * WebSocket ports starting at `basePort`; each Chrome profile's extension is
 * configured (in its options UI) to connect to one specific port in the range.
 * A port therefore identifies a profile.
 */
export const mcpConfig = {
  /** First port in the per-profile range. */
  basePort: 9222,
  /** How many consecutive ports the server binds (9222..9241 by default). */
  portCount: 20,

  /** Bound host for every WebSocket listener. Localhost only. */
  host: "127.0.0.1",

  /** Server -> extension liveness ping interval (ms). */
  pingIntervalMs: 10_000,
  /** Missed pongs before the server considers a socket dead. */
  maxMissedPongs: 3,

  /** Default request timeout when a message type has no specific override (ms). */
  defaultTimeoutMs: 30_000,

  errors: {
    /** Marker the extension returns when it has no tab to act on. */
    noConnectedTab: "No connected tab",
  },
} as const;

export type McpConfig = typeof mcpConfig;

/** Enumerate the configured port range: [basePort, basePort + portCount). */
export function listPorts(
  cfg: { basePort: number; portCount: number } = mcpConfig,
): number[] {
  return Array.from({ length: cfg.portCount }, (_, i) => cfg.basePort + i);
}

/** True if a port falls inside the configured range. */
export function isPortInRange(
  port: number,
  cfg: { basePort: number; portCount: number } = mcpConfig,
): boolean {
  return port >= cfg.basePort && port < cfg.basePort + cfg.portCount;
}
