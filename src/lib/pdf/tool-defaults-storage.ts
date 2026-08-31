/**
 * Persists per-tool drawing defaults across sessions.
 *
 * Only the four `ToolSettings` numbers and colours are stored — never anything
 * from a document. Nothing about an opened file may reach disk: that is the
 * whole promise of this tool, and a "recently used" convenience is not worth
 * weakening it for.
 */

import type { ToolId, ToolSettings } from './types';

const KEY = 'messyui.pdf.tool-defaults.v1';

export type StoredToolDefaults = Partial<Record<ToolId, Partial<ToolSettings>>>;

/**
 * Reads the saved defaults, or `null` when there are none.
 *
 * Every access is guarded: `localStorage` throws rather than returning null in
 * a private window on some browsers, and a stored value written by an older
 * build may not parse. Neither is worth failing the editor over.
 */
export function loadToolDefaults(): StoredToolDefaults | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object'
      ? (parsed as StoredToolDefaults)
      : null;
  } catch {
    return null;
  }
}

export function saveToolDefaults(defaults: Record<ToolId, ToolSettings>): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(defaults));
  } catch {
    // A full or disabled store is not a reason to interrupt an edit.
  }
}
