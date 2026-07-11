/**
 * Stable, human-friendly tab numbers ("tab 1", "tab 2") for this profile.
 *
 * A slot is assigned to a tab the first time we see it and stays put for the
 * tab's lifetime, so the number the user reads in the popup keeps matching the
 * same tab. Closed tabs free their slot; new tabs take the lowest free number.
 * Persisted to chrome.storage.local so numbers survive service-worker restarts.
 */
const KEY = "tabSlots";

let cache: Record<number, number> | null = null;
let loading: Promise<void> | null = null;

async function ensureLoaded(): Promise<void> {
  if (cache) return;
  if (!loading) {
    loading = chrome.storage.local.get(KEY).then((s) => {
      cache = (s[KEY] as Record<number, number> | undefined) ?? {};
    });
  }
  await loading;
}

/**
 * Reconcile slots against the currently-open tab ids and return a
 * tabId -> slot map. Drops slots for closed tabs, assigns lowest-free to new.
 */
export async function assignSlots(
  tabIds: number[],
): Promise<Map<number, number>> {
  await ensureLoaded();
  const map = cache!;

  const open = new Set(tabIds);
  for (const key of Object.keys(map)) {
    if (!open.has(Number(key))) delete map[Number(key)];
  }

  const used = new Set(Object.values(map));
  const lowestFree = (): number => {
    let n = 1;
    while (used.has(n)) n++;
    used.add(n);
    return n;
  };
  for (const id of tabIds) {
    if (map[id] == null) map[id] = lowestFree();
  }

  await chrome.storage.local.set({ [KEY]: map });
  return new Map(tabIds.map((id) => [id, map[id]!]));
}
