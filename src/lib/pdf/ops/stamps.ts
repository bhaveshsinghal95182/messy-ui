/**
 * Watermarks, page numbers and headers/footers.
 *
 * All three are the same operation underneath: synthesise a text object per
 * page from a template, and let the normal export path draw it. Doing it as
 * objects rather than as bespoke drawing code means they inherit positioning,
 * opacity, rotation and undo for free, and appear on screen before export
 * rather than only in the saved file.
 */

import { newId } from '../reducer';
import type {
  PageEntry,
  PdfEditorState,
  PdfObject,
  RGB,
  TextAlign,
} from '../types';

export type StampPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface StampOptions {
  /** Supports {page}, {pages}, {date} and {filename}. */
  template: string;
  position: StampPosition;
  size: number;
  color: RGB;
  opacity: number;
  /** Degrees counter-clockwise; 45 is the classic diagonal watermark. */
  rotation: number;
  /** 1-based inclusive page range, or null for every page. */
  range: { from: number; to: number } | null;
  /** Distance from the page edge, in points. */
  margin: number;
}

export const DEFAULT_STAMP: StampOptions = {
  template: '{page} / {pages}',
  position: 'bottom-center',
  size: 10,
  color: { r: 0.3, g: 0.3, b: 0.3 },
  opacity: 1,
  rotation: 0,
  range: null,
  margin: 36,
};

export const WATERMARK_PRESET: StampOptions = {
  ...DEFAULT_STAMP,
  template: 'DRAFT',
  position: 'center',
  size: 72,
  color: { r: 0.6, g: 0.6, b: 0.6 },
  opacity: 0.25,
  rotation: 45,
  margin: 0,
};

/** Fills the placeholders for one page. */
export function renderTemplate(
  template: string,
  context: { page: number; pages: number; filename: string }
): string {
  return template
    .replaceAll('{page}', String(context.page))
    .replaceAll('{pages}', String(context.pages))
    .replaceAll('{filename}', context.filename.replace(/\.pdf$/i, ''))
    .replaceAll('{date}', new Date().toLocaleDateString());
}

/** Where the text box sits, given the page size and chosen corner. */
function placeBox(
  position: StampPosition,
  pageWidth: number,
  pageHeight: number,
  size: number,
  margin: number
): { x: number; y: number; w: number; h: number; align: TextAlign } {
  const height = size * 1.4;
  const width = pageWidth - margin * 2;

  const vertical = position.startsWith('top')
    ? pageHeight - margin - height
    : position.startsWith('bottom')
      ? margin
      : (pageHeight - height) / 2;

  const align: TextAlign = position.endsWith('left')
    ? 'left'
    : position.endsWith('right')
      ? 'right'
      : 'center';

  return { x: margin, y: vertical, w: width, h: height, align };
}

/**
 * Builds one text object per page in range.
 *
 * Returned rather than dispatched so the caller can apply them as a single
 * undoable action instead of one per page.
 */
export function buildStamps(
  state: PdfEditorState,
  options: StampOptions
): { pageId: string; object: PdfObject }[] {
  const total = state.pages.length;
  const from = options.range?.from ?? 1;
  const to = options.range?.to ?? total;

  const stamps: { pageId: string; object: PdfObject }[] = [];

  state.pages.forEach((entry: PageEntry, index) => {
    const pageNumber = index + 1;
    if (pageNumber < from || pageNumber > to) return;

    const size = state.sources[entry.sourceId]?.pageSizes[entry.sourceIndex];
    const pageWidth = size?.width ?? 612;
    const pageHeight = size?.height ?? 792;

    const box = placeBox(
      options.position,
      pageWidth,
      pageHeight,
      options.size,
      options.margin
    );

    stamps.push({
      pageId: entry.id,
      object: {
        id: newId(),
        kind: 'text',
        text: renderTemplate(options.template, {
          page: pageNumber,
          pages: total,
          filename: state.exportSettings.filename,
        }),
        fontId: 'Helvetica',
        size: options.size,
        color: options.color,
        align: box.align,
        lineHeight: 1.2,
        bold: false,
        italic: false,
        autoSize: false,
        rect: { x: box.x, y: box.y, w: box.w, h: box.h },
        rotation: options.rotation,
        opacity: options.opacity,
        locked: false,
        // Below anything the user has placed by hand.
        z: -1,
        createdAt: Date.now(),
      },
    });
  });

  return stamps;
}
