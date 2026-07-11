import { mcpConfig } from "@monkbrowse/config/mcp.config";
import { Peer, RequestTimeoutError } from "@monkbrowse/messaging";
import {
  type Hello,
  type HelloAck,
  type MessageType,
  type RequestOf,
  type ResponseOf,
  type TabInfo,
  messageTimeouts,
  retryableMessages,
  socketMessages,
} from "@monkbrowse/protocol";

import { debugLog } from "./log";

/** One Chrome profile's connection slot, keyed by its port. */
export interface ProfileConnection {
  /** The port this profile connects on. Its stable routing key. */
  port: number;
  /** Live messaging peer, or null while disconnected. */
  peer: Peer | null;
  /** Stable uuid announced by the extension; null until first hello. */
  profileId: string | null;
  /** Friendly label from the options UI. */
  label: string;
  /** Cosmetic Chrome profile name. */
  chromeProfileName?: string;
  status: "connected" | "disconnected";
  connectedAt: number | null;
  /** Last known tab enumeration for this profile. */
  tabs: Map<number, TabInfo>;
}

function freshConnection(port: number): ProfileConnection {
  return {
    port,
    peer: null,
    profileId: null,
    label: `Profile @${port}`,
    status: "disconnected",
    connectedAt: null,
    tabs: new Map(),
  };
}

/**
 * Holds one {@link ProfileConnection} per configured port. Replaces the
 * original single-`_ws` context: a new connection never evicts a different
 * profile — only a reconnect of the same profileId reuses a slot.
 */
export class ConnectionRegistry {
  private readonly byPort = new Map<number, ProfileConnection>();
  private readonly byProfileId = new Map<string, number>();
  private lastUsedPort: number | null = null;

  constructor(
    ports: number[],
    private readonly serverVersion: string,
  ) {
    for (const port of ports) {
      this.byPort.set(port, freshConnection(port));
    }
  }

  get(port: number): ProfileConnection | undefined {
    return this.byPort.get(port);
  }

  listConnected(): ProfileConnection[] {
    return [...this.byPort.values()].filter((c) => c.status === "connected");
  }

  /**
   * Adopt (or reconnect) a profile on `port`. Replace-same-profile-only: a
   * different live profileId on the same port is rejected, not evicted.
   */
  handleHello(port: number, peer: Peer, hello: Hello): HelloAck {
    const conn = this.byPort.get(port);
    if (!conn) {
      return {
        ok: false,
        assignedPort: port,
        serverVersion: this.serverVersion,
        reason: `Port ${port} is not in the server's configured range.`,
      };
    }

    if (
      conn.status === "connected" &&
      conn.peer &&
      conn.peer !== peer &&
      conn.profileId &&
      conn.profileId !== hello.profileId
    ) {
      return {
        ok: false,
        assignedPort: port,
        serverVersion: this.serverVersion,
        reason: `Port ${port} is already in use by profile "${conn.label}". Pick a different port in the extension options.`,
      };
    }

    // Same profile reconnecting: drop the stale socket before swapping.
    if (conn.peer && conn.peer !== peer) {
      try {
        conn.peer.close();
      } catch {
        // already gone
      }
    }

    if (conn.profileId && conn.profileId !== hello.profileId) {
      this.byProfileId.delete(conn.profileId);
    }

    conn.peer = peer;
    conn.profileId = hello.profileId;
    conn.label = hello.label || `Profile @${port}`;
    conn.chromeProfileName = hello.chromeProfileName;
    conn.status = "connected";
    conn.connectedAt = Date.now();
    conn.tabs = new Map(hello.tabs.map((t) => [t.tabId, t]));
    this.byProfileId.set(hello.profileId, port);
    if (this.lastUsedPort === null) {
      this.lastUsedPort = port;
    }
    debugLog(`[registry] profile "${conn.label}" connected on :${port}`);
    return { ok: true, assignedPort: port, serverVersion: this.serverVersion };
  }

  /** Mark a profile disconnected — but keep the slot, label, and tabs. */
  handleDisconnect(port: number, peer: Peer): void {
    const conn = this.byPort.get(port);
    if (!conn || conn.peer !== peer) {
      return; // stale socket from a replaced connection
    }
    conn.peer = null;
    conn.status = "disconnected";
    conn.connectedAt = null;
    debugLog(`[registry] profile "${conn.label}" disconnected from :${port}`);
  }

  /** Refresh a profile's tab list from an extension push. */
  handleTabsChanged(port: number, peer: Peer, tabs: TabInfo[]): void {
    const conn = this.byPort.get(port);
    if (!conn || conn.peer !== peer) {
      return;
    }
    conn.tabs = new Map(tabs.map((t) => [t.tabId, t]));
  }

  markUsed(port: number): void {
    this.lastUsedPort = port;
  }

  /** Map a user-facing tab slot number to a real chrome tab id, or undefined. */
  tabIdForSlot(conn: ProfileConnection, slot: number): number | undefined {
    for (const t of conn.tabs.values()) {
      if (t.slot === slot) return t.tabId;
    }
    return undefined;
  }

  /**
   * Pick the default tab when the AI omits `tab`: the active shared tab, else
   * the only shared tab. Throws (actionably) if zero or ambiguous. `conn.tabs`
   * only ever holds SHARED tabs, so this can never pick an unshared tab.
   */
  defaultSharedTab(conn: ProfileConnection): number {
    const shared = [...conn.tabs.values()];
    if (shared.length === 0) {
      throw new Error(
        `No tabs are shared with the AI in profile "${conn.label}". Open the monkbrowse popup and toggle a tab on.`,
      );
    }
    const active = shared.find((t) => t.active);
    if (active) return active.tabId;
    if (shared.length === 1) return shared[0]!.tabId;
    throw new Error(
      `Multiple tabs are shared in "${conn.label}" — say which with \`tab\` (see browser_list_tabs).`,
    );
  }

  /** Re-fetch a profile's tabs from its extension and refresh the cache. */
  async refreshTabs(conn: ProfileConnection): Promise<TabInfo[]> {
    const { tabs } = await this.send(conn, "list_tabs", {});
    conn.tabs = new Map(tabs.map((t) => [t.tabId, t]));
    return tabs;
  }

  /**
   * Resolve a `{ profile }` selector to a connected profile.
   * - number: that port
   * - string: a profileId, or a numeric string treated as a port
   * - undefined: the focused profile (the only one, else the last used)
   */
  resolveProfile(selector?: number | string): ProfileConnection {
    if (selector !== undefined) {
      let port: number | undefined;
      if (typeof selector === "number") {
        port = selector;
      } else if (this.byProfileId.has(selector)) {
        port = this.byProfileId.get(selector);
      } else if (/^\d+$/.test(selector)) {
        port = Number(selector);
      }
      const conn = port !== undefined ? this.byPort.get(port) : undefined;
      if (!conn) {
        throw new Error(
          `No profile matches "${selector}". ${this.candidatesHint()}`,
        );
      }
      if (conn.status !== "connected") {
        throw new Error(this.noConnectionMessage(conn));
      }
      return conn;
    }

    const connected = this.listConnected();
    if (connected.length === 1) {
      return connected[0]!;
    }
    if (this.lastUsedPort !== null) {
      const last = this.byPort.get(this.lastUsedPort);
      if (last && last.status === "connected") {
        return last;
      }
    }
    if (connected.length === 0) {
      throw new Error(
        "No browser profile is connected. Open the Monkbrowse extension in a Chrome profile and click Connect.",
      );
    }
    throw new Error(
      `Multiple profiles are connected — specify which with the "profile" argument. ${this.candidatesHint()}`,
    );
  }

  /** Send a request to a profile's extension and return the typed response. */
  async send<T extends MessageType>(
    conn: ProfileConnection,
    type: T,
    payload: RequestOf<T>,
    opts: { timeoutMs?: number } = {},
  ): Promise<ResponseOf<T>> {
    if (!conn.peer || conn.status !== "connected") {
      throw new Error(this.noConnectionMessage(conn));
    }
    const timeoutMs =
      opts.timeoutMs ?? messageTimeouts[type] ?? mcpConfig.defaultTimeoutMs;
    this.markUsed(conn.port);

    const doSend = async (): Promise<ResponseOf<T>> => {
      const raw = await conn.peer!.request(type, payload, { timeoutMs });
      const schema = socketMessages[type].response;
      return schema.parse(raw) as ResponseOf<T>;
    };

    try {
      return await doSend();
    } catch (err) {
      if (err instanceof RequestTimeoutError && retryableMessages.has(type)) {
        return await doSend();
      }
      throw err;
    }
  }

  closeAll(): void {
    for (const conn of this.byPort.values()) {
      conn.peer?.close();
    }
  }

  private candidatesHint(): string {
    const connected = this.listConnected();
    if (connected.length === 0) {
      return "No profiles are currently connected.";
    }
    const list = connected
      .map((c) => `${c.port} ("${c.label}")`)
      .join(", ");
    return `Connected profiles: ${list}.`;
  }

  private noConnectionMessage(conn: ProfileConnection): string {
    return `Profile "${conn.label}" (port ${conn.port}) is not connected. Open the Monkbrowse extension in that Chrome profile and click Connect.`;
  }
}
