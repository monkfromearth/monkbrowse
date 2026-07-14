/**
 * Explicit per-tab sharing. Only tabs the user shares (toggled on in the popup)
 * are visible to the AI and drivable. Shared tabs get a stable number (slot);
 * unshared tabs are invisible to the server. Persisted to chrome.storage.local
 * so shares + numbers survive service-worker restarts.
 */
const SHARED_KEY = "sharedTabs"; // number[]  — shared chrome tab ids
const SLOT_KEY = "tabSlots"; // { [tabId]: slot } — numbers for shared tabs

let shared: Set<number> | null = null;
let slots: Record<number, number> | null = null;
let loading: Promise<void> | null = null;

/** Test-only: clear the in-memory cache so the next call re-reads storage. */
export function __resetCache(): void {
  shared = null;
  slots = null;
  loading = null;
}

async function ensure(): Promise<void> {
  if (shared && slots) return;
  if (!loading) {
    loading = (async () => {
      const s = await chrome.storage.local.get([SHARED_KEY, SLOT_KEY]);
      shared = new Set((s[SHARED_KEY] as number[] | undefined) ?? []);
      slots = (s[SLOT_KEY] as Record<number, number> | undefined) ?? {};
    })();
  }
  await loading;
}

async function persist(): Promise<void> {
  await chrome.storage.local.set({
    [SHARED_KEY]: [...shared!],
    [SLOT_KEY]: slots,
  });
}

export async function isShared(tabId: number): Promise<boolean> {
  await ensure();
  return shared!.has(tabId);
}

export async function setShared(tabId: number, on: boolean): Promise<void> {
  await ensure();
  if (on) {
    shared!.add(tabId);
  } else {
    shared!.delete(tabId);
    delete slots![tabId];
  }
  await persist();
}

export async function sharedSet(): Promise<Set<number>> {
  await ensure();
  return new Set(shared!);
}

/** Share or unshare many tabs at once. */
export async function setManyShared(
  tabIds: number[],
  on: boolean,
): Promise<void> {
  await ensure();
  for (const id of tabIds) {
    if (on) {
      shared!.add(id);
    } else {
      shared!.delete(id);
      delete slots![id];
    }
  }
  await persist();
}

/**
 * Reconcile shares + slots against the currently-open tabs, assigning the
 * lowest-free number to any shared tab that lacks one. Returns tabId -> slot
 * for currently-shared, open tabs.
 */
export async function sharedSlots(
  openIds: number[],
): Promise<Map<number, number>> {
  await ensure();
  const open = new Set(openIds);

  // Deleting the current entry while iterating a live Set is well-defined.
  for (const id of shared!) {
    if (!open.has(id)) {
      shared!.delete(id);
      delete slots![id];
    }
  }
  for (const key of Object.keys(slots!)) {
    if (!open.has(Number(key))) delete slots![Number(key)];
  }

  const used = new Set(Object.values(slots!));
  const lowestFree = (): number => {
    let n = 1;
    while (used.has(n)) n++;
    used.add(n);
    return n;
  };
  for (const id of shared!) {
    if (slots![id] == null) slots![id] = lowestFree();
  }

  await persist();
  return new Map(
    [...shared!].filter((id) => open.has(id)).map((id) => [id, slots![id]!]),
  );
}
