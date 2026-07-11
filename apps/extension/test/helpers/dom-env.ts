/**
 * Shared headless-DOM setup for extension tests. Registers happy-dom globals
 * (once), stubs layout (happy-dom has no layout engine) so the snapshot's
 * visibility filter passes, and polyfills CSS.escape.
 */
import { GlobalRegistrator } from "@happy-dom/global-registrator";

const g = globalThis as unknown as {
  __happyRegistered?: boolean;
  CSS?: { escape: (s: string) => string };
};

if (!g.__happyRegistered) {
  GlobalRegistrator.register();
  g.__happyRegistered = true;
}

if (!g.CSS) {
  g.CSS = { escape: (s: string) => s };
}

Object.defineProperty(Element.prototype, "getBoundingClientRect", {
  configurable: true,
  value: () => ({
    width: 120,
    height: 24,
    top: 0,
    left: 0,
    right: 120,
    bottom: 24,
    x: 0,
    y: 0,
    toJSON() {},
  }),
});

export {};
