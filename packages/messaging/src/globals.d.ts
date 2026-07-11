// Minimal isomorphic timer globals. Both Node and browsers provide these; we
// declare just the surface we use so the package needs neither @types/node nor
// the DOM lib (keeping it safe to bundle into the MV3 service worker).
declare function setTimeout(handler: () => void, timeout?: number): number;
declare function clearTimeout(handle?: number): void;
