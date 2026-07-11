// Minimal isomorphic timer globals (present in both Node and browsers), so this
// package needs neither @types/node nor the DOM lib.
declare function setTimeout(handler: () => void, timeout?: number): number;
declare function clearTimeout(handle?: number): void;
