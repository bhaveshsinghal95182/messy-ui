/**
 * Page-level operations.
 *
 * Because `pages` is a list of references into loaded sources rather than a
 * copy of any document, merge, split, extract, reorder, delete and duplicate
 * are all just array manipulation — the heavy lifting only happens once, at
 * export time.
 */

import { newId } from '../reducer';
import type { PageEntry, Quadrant, SourceId } from '../types';

/** A parsed inclusive page range, 0-based. */
export interface PageRange {
  start: number;
  end: number;
}

/**
 * Parses a range spec of the sort people actually type: "1-3, 7, 9-" and
 * "1,3,5". Input is 1-based (what the UI shows), output is 0-based.
 *
 * Invalid fragments are skipped rather than throwing, so a half-typed spec
 * still previews the part that parses.
 */
export function parseRangeSpec(spec: string, pageCount: number): PageRange[] {
  const ranges: PageRange[] = [];

  for (const raw of spec.split(',')) {
    const part = raw.trim();
    if (!part) continue;

    const match = /^(\d+)?\s*(-)?\s*(\d+)?$/.exec(part);
    if (!match) continue;
    const [, from, dash, to] = match;

    if (!dash) {
      if (!from) continue;
      const index = Number(from) - 1;
      if (index >= 0 && index < pageCount)
        ranges.push({ start: index, end: index });
      continue;
    }

    // "-5" means from the beginning; "9-" means through to the end.
    const start = from ? Number(from) - 1 : 0;
    const end = to ? Number(to) - 1 : pageCount - 1;
    if (Number.isNaN(start) || Number.isNaN(end)) continue;

    const lower = Math.max(0, Math.min(start, end));
    const upper = Math.min(pageCount - 1, Math.max(start, end));
    if (lower <= upper) ranges.push({ start: lower, end: upper });
  }

  return ranges;
}

/** Flattens ranges to a sorted, de-duplicated list of page indices. */
export const rangesToIndices = (ranges: PageRange[]): number[] => {
  const indices = new Set<number>();
  for (const range of ranges) {
    for (let index = range.start; index <= range.end; index += 1) {
      indices.add(index);
    }
  }
  return [...indices].sort((a, b) => a - b);
};

/** Renders indices back as a compact human-readable spec ("1-3, 7"). */
export function formatIndices(indices: number[]): string {
  if (indices.length === 0) return '';
  const sorted = [...indices].sort((a, b) => a - b);
  const parts: string[] = [];

  let start = sorted[0];
  let previous = sorted[0];

  for (const index of sorted.slice(1)) {
    if (index === previous + 1) {
      previous = index;
      continue;
    }
    parts.push(
      start === previous ? `${start + 1}` : `${start + 1}-${previous + 1}`
    );
    start = index;
    previous = index;
  }
  parts.push(
    start === previous ? `${start + 1}` : `${start + 1}-${previous + 1}`
  );

  return parts.join(', ');
}

/** Moves one page, returning a new array. */
export function movePage(
  pages: PageEntry[],
  from: number,
  to: number
): PageEntry[] {
  if (from === to || from < 0 || to < 0) return pages;
  if (from >= pages.length || to >= pages.length) return pages;
  const next = [...pages];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * A blank page, represented as an entry pointing at a synthetic source.
 *
 * Keeping blanks in the same list as real pages means every page operation
 * works on them without special-casing; the export pipeline recognises the
 * marker source id and calls `insertPage` instead of copying.
 */
export const BLANK_SOURCE_ID = '__blank__' as SourceId;

export const createBlankPage = (
  width = 612,
  height = 792
): PageEntry & { blankSize: { width: number; height: number } } => ({
  id: newId(),
  sourceId: BLANK_SOURCE_ID,
  sourceIndex: 0,
  rotation: 0 as Quadrant,
  crop: null,
  blankSize: { width, height },
});

export const isBlankPage = (entry: PageEntry): boolean =>
  entry.sourceId === BLANK_SOURCE_ID;

/**
 * Splits an ordered page list at the given boundaries.
 *
 * `boundaries` holds the 0-based index of the first page of each chunk after
 * the first, which is what a "split before page N" UI produces directly.
 */
export function splitAt(
  pages: PageEntry[],
  boundaries: number[]
): PageEntry[][] {
  const cuts = [...new Set(boundaries)]
    .filter((index) => index > 0 && index < pages.length)
    .sort((a, b) => a - b);

  if (cuts.length === 0) return [pages];

  const chunks: PageEntry[][] = [];
  let previous = 0;
  for (const cut of cuts) {
    chunks.push(pages.slice(previous, cut));
    previous = cut;
  }
  chunks.push(pages.slice(previous));
  return chunks.filter((chunk) => chunk.length > 0);
}

/** Splits into fixed-size chunks, for "every N pages". */
export function splitEvery(pages: PageEntry[], size: number): PageEntry[][] {
  if (size < 1) return [pages];
  const chunks: PageEntry[][] = [];
  for (let index = 0; index < pages.length; index += size) {
    chunks.push(pages.slice(index, index + size));
  }
  return chunks;
}

/** Derives an output filename for one chunk of a split. */
export const chunkFilename = (
  base: string,
  index: number,
  total: number
): string => {
  const stem = base.replace(/\.pdf$/i, '');
  const width = String(total).length;
  return `${stem}-${String(index + 1).padStart(width, '0')}.pdf`;
};
