/**
 * Page rasterisation: the render lifecycle, canvas sizing, and thumbnails.
 */

import type { PDFPageProxy, RenderTask } from 'pdfjs-dist';
import type { PageViewport } from 'pdfjs-dist/types/src/display/page_viewport';
import {
  MAX_CANVAS_AREA,
  THUMBNAIL_CONCURRENCY,
  THUMBNAIL_WIDTH,
} from './constants';
import { getDocument } from './document';
import { isRenderingCancelled } from './pdfjs';
import type { PageEntry, SourceId } from './types';

export interface RenderResult {
  viewport: PageViewport;
  /** Pixel ratio actually used, which may be below devicePixelRatio. */
  pixelRatio: number;
}

export const getPage = async (
  sourceId: SourceId,
  sourceIndex: number
): Promise<PDFPageProxy | null> => {
  const proxy = getDocument(sourceId);
  if (!proxy) return null;
  return proxy.getPage(sourceIndex + 1);
};

/**
 * Chooses a device pixel ratio that keeps the canvas within what browsers will
 * actually allocate.
 *
 * Safari on iOS silently hands back a blank canvas above roughly 16.7
 * megapixels rather than throwing, so a retina phone rendering an A3 page at
 * 400% would produce an empty page with no error anywhere. Scaling the ratio
 * down keeps the render correct at the cost of some sharpness.
 */
export const safePixelRatio = (
  cssWidth: number,
  cssHeight: number,
  preferred = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
): number => {
  const area = cssWidth * cssHeight * preferred * preferred;
  if (area <= MAX_CANVAS_AREA) return preferred;
  const capped = Math.sqrt(MAX_CANVAS_AREA / (cssWidth * cssHeight));
  return Math.max(1, Math.min(preferred, capped));
};

/**
 * Renders a page into a canvas.
 *
 * The returned task must be cancelled by the caller's effect cleanup — pdf.js
 * keeps rendering into a detached canvas otherwise, which wastes the worker and
 * can resolve after the component is gone.
 */
export function renderPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number,
  rotation: number
): { task: RenderTask; result: RenderResult } | null {
  const viewport = page.getViewport({ scale, rotation });
  const pixelRatio = safePixelRatio(viewport.width, viewport.height);

  canvas.width = Math.floor(viewport.width * pixelRatio);
  canvas.height = Math.floor(viewport.height * pixelRatio);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return null;

  // PDF pages are opaque white; without this, a cancelled or partial render
  // shows through as transparent black.
  context.save();
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();

  // v6 prefers the `canvas` parameter over `canvasContext`; the transform
  // scales the viewport up to the backing store's device pixels.
  const task = page.render({
    canvas,
    viewport,
    transform:
      pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
  });

  return { task, result: { viewport, pixelRatio } };
}

/** Awaits a render, swallowing only the benign cancellation rejection. */
export async function settleRender(task: RenderTask): Promise<boolean> {
  try {
    await task.promise;
    return true;
  } catch (error) {
    if (isRenderingCancelled(error)) return false;
    throw error;
  }
}

/**
 * Renders a page to an offscreen canvas at a given DPI.
 *
 * Used by thumbnails, redaction, OCR and the raster compression tier — anything
 * that needs pixels rather than a displayed page.
 */
export async function rasterizePage(
  page: PDFPageProxy,
  rotation: number,
  dpi: number
): Promise<HTMLCanvasElement | null> {
  const scale = dpi / 72;
  const viewport = page.getViewport({ scale, rotation });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return null;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const task = page.render({ canvas, viewport });
  const finished = await settleRender(task);
  return finished ? canvas : null;
}

export const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: 'image/png' | 'image/jpeg' = 'image/png',
  quality?: number
): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/* -------------------------------------------------------------------------- */
/*                                 Thumbnails                                  */
/* -------------------------------------------------------------------------- */

/**
 * Thumbnail cache, keyed by page entry plus the inputs that change its
 * appearance. Rotating a page changes the key, so the stale image is never
 * shown, and the old URL is revoked rather than leaked.
 */
const thumbnails = new Map<string, string>();

const thumbnailKey = (entry: PageEntry, rotation: number) =>
  `${entry.id}:${rotation}`;

let inFlight = 0;
const queue: (() => void)[] = [];

/** Caps concurrent thumbnail renders so they can't starve the visible page. */
const acquireSlot = (): Promise<void> =>
  new Promise((resolve) => {
    if (inFlight < THUMBNAIL_CONCURRENCY) {
      inFlight += 1;
      resolve();
      return;
    }
    queue.push(() => {
      inFlight += 1;
      resolve();
    });
  });

const releaseSlot = () => {
  inFlight -= 1;
  queue.shift()?.();
};

export async function getThumbnail(
  entry: PageEntry,
  rotation: number
): Promise<string | null> {
  const key = thumbnailKey(entry, rotation);
  const cached = thumbnails.get(key);
  if (cached) return cached;

  await acquireSlot();
  try {
    // Another caller may have finished the same thumbnail while we queued.
    const raced = thumbnails.get(key);
    if (raced) return raced;

    const page = await getPage(entry.sourceId, entry.sourceIndex);
    if (!page) return null;

    const unscaled = page.getViewport({ scale: 1, rotation });
    const canvas = await rasterizePage(
      page,
      rotation,
      (THUMBNAIL_WIDTH / unscaled.width) * 72
    );
    page.cleanup();
    if (!canvas) return null;

    const blob = await canvasToBlob(canvas, 'image/png');
    if (!blob) return null;

    const url = URL.createObjectURL(blob);
    // Drop any thumbnail of this page at a different rotation.
    for (const existing of thumbnails.keys()) {
      if (existing.startsWith(`${entry.id}:`) && existing !== key) {
        URL.revokeObjectURL(thumbnails.get(existing)!);
        thumbnails.delete(existing);
      }
    }
    thumbnails.set(key, url);
    return url;
  } finally {
    releaseSlot();
  }
}

/** Revokes every cached thumbnail. Call when the document is closed. */
export function clearThumbnails(): void {
  for (const url of thumbnails.values()) URL.revokeObjectURL(url);
  thumbnails.clear();
}
