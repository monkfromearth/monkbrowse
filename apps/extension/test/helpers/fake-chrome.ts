/**
 * In-memory `chrome.*` for tests. Backs chrome.tabs / storage / scripting /
 * windows / runtime with plain objects, and routes tab messages to a content-op
 * responder (so the real executor + DOM engine run against a headless DOM).
 *
 * Limitation: all tabs share the one headless `document`, so DOM ops act on the
 * global document regardless of tabId. Multi-tab ROUTING is covered by the
 * server integration test; this covers the extension's own chrome-API logic.
 */
export interface FakeTab {
  id: number;
  url: string;
  title: string;
  active: boolean;
  windowId: number;
  status: string;
}

export interface FakeChromeHandle {
  tabs: FakeTab[];
  storage: Record<string, unknown>;
  screenshots: number;
  captureCalledWhileActive: boolean[];
  addTab(p?: Partial<FakeTab>): FakeTab;
}

type Responder = (
  tabId: number,
  msg: { kind: string; [k: string]: unknown },
) => Promise<unknown>;

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

export function installFakeChrome(responder: Responder): FakeChromeHandle {
  let nextId = 100;
  const handle: FakeChromeHandle = {
    tabs: [],
    storage: {},
    screenshots: 0,
    captureCalledWhileActive: [],
    addTab(p = {}) {
      const tab: FakeTab = {
        id: p.id ?? ++nextId,
        url: p.url ?? "https://example.com",
        title: p.title ?? "Example",
        active: p.active ?? false,
        windowId: p.windowId ?? 1,
        status: p.status ?? "complete",
      };
      handle.tabs.push(tab);
      return tab;
    },
  };

  const get = (id: number): FakeTab => {
    const t = handle.tabs.find((x) => x.id === id);
    if (!t) throw new Error(`No tab with id ${id}`);
    return t;
  };
  const listeners = () => ({ addListener() {}, removeListener() {} });

  const chrome = {
    tabs: {
      async query(q: Partial<FakeTab> = {}) {
        return handle.tabs.filter((t) =>
          Object.entries(q).every(([k, v]) =>
            k === "lastFocusedWindow" || k === "currentWindow"
              ? true
              : (t as unknown as Record<string, unknown>)[k] === v,
          ),
        );
      },
      async get(id: number) {
        return get(id);
      },
      async update(id: number, props: Partial<FakeTab>) {
        const t = get(id);
        if (props.active) {
          for (const other of handle.tabs) other.active = false;
          t.active = true;
        }
        if (props.url != null) {
          t.url = props.url;
          t.title = props.url;
        }
        return t;
      },
      async create(props: { url?: string }) {
        const t = handle.addTab({ url: props.url, active: true });
        for (const other of handle.tabs) other.active = other.id === t.id;
        return t;
      },
      async remove(id: number) {
        handle.tabs = handle.tabs.filter((t) => t.id !== id);
      },
      async reload(id: number) {
        get(id);
      },
      async sendMessage(id: number, msg: { cs?: boolean; kind: string }) {
        if (!msg.cs) return undefined;
        try {
          return { ok: true, result: await responder(id, msg) };
        } catch (err) {
          return {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
      async captureVisibleTab() {
        handle.screenshots++;
        return TINY_PNG;
      },
      onCreated: listeners(),
      onRemoved: listeners(),
      onUpdated: listeners(),
      onActivated: listeners(),
    },
    scripting: {
      async executeScript() {
        return [];
      },
    },
    windows: {
      async update() {},
    },
    storage: {
      local: {
        async get(keys: string | string[]) {
          const arr = Array.isArray(keys) ? keys : [keys];
          const out: Record<string, unknown> = {};
          for (const k of arr) {
            if (k in handle.storage) out[k] = handle.storage[k];
          }
          return out;
        },
        async set(obj: Record<string, unknown>) {
          Object.assign(handle.storage, obj);
        },
      },
    },
    runtime: {
      getManifest: () => ({ version: "0.0.0-test" }),
    },
  };

  (globalThis as unknown as { chrome: unknown }).chrome = chrome;
  return handle;
}

export function uninstallFakeChrome(): void {
  delete (globalThis as unknown as { chrome?: unknown }).chrome;
}
