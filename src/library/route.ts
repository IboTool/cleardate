// Drug Library hash routes. Kept tiny so the app shell can route without loading the library view.

/** `#library` → { id: null }, `#library/<id>` → { id }, anything else → null. */
export function parseLibraryHash(hash: string): { id: string | null } | null {
  const m = hash.match(/^#library(?:\/(.*))?$/);
  if (!m) return null;
  let id = m[1] ?? '';
  try {
    id = decodeURIComponent(id);
  } catch {
    /* keep it raw */
  }
  return { id: id.trim() || null };
}

export const libraryHash = (id: string | null) => (id ? `#library/${encodeURIComponent(id)}` : '#library');

/**
 * History bookkeeping: `lib` counts library entries pushed since the overlay opened; `root` is what
 * lies beneath them ('app' when opened from the app, 'lib' when the page was loaded on a library URL).
 */
export interface LibraryHistoryState {
  lib: number;
  root: 'app' | 'lib';
}

/** State for the next library entry pushed on top of `current`. */
export function nextLibraryState(current: LibraryHistoryState | null, inLibrary: boolean): LibraryHistoryState {
  if (!inLibrary) return { lib: 1, root: 'app' };
  return { lib: (current?.lib ?? 0) + 1, root: current?.root ?? 'lib' };
}

/**
 * How to close: step back over the library entries (to the app, or to the root library entry that
 * then has its hash stripped), or just strip the hash when this is the only entry.
 */
export function closePlan(current: LibraryHistoryState | null): { back: number; stripHash: boolean } {
  const depth = current?.lib ?? 0;
  if (depth > 0) return { back: depth, stripHash: current?.root !== 'app' };
  return { back: 0, stripHash: true };
}
