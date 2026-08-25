/**
 * Making files smaller, honestly.
 *
 * The important thing here is expectation-setting. PDF content streams and
 * embedded fonts are already Flate-compressed, so a text document exported
 * from a word processor has almost nothing left to squeeze — a tool promising
 * "up to 90% smaller" on such a file is lying. Scans, on the other hand, are
 * mostly image data and genuinely do shrink dramatically.
 *
 * Three tiers, in increasing order of what they cost you.
 */

import { loadPdfLib } from '../export/build';
import { getPage, canvasToBlob } from '../render';
import { effectiveRotation } from '../document';
import type { PdfEditorState } from '../types';

export type CompressionTier = 'restructure' | 'raster';

export interface CompressionEstimate {
  tier: CompressionTier;
  label: string;
  description: string;
  /** What this costs the document, stated plainly. */
  tradeoff: string | null;
}

export const COMPRESSION_TIERS: CompressionEstimate[] = [
  {
    tier: 'restructure',
    label: 'Tidy up',
    description:
      'Rebuilds the file with compressed cross-reference and object streams, and drops anything no longer referenced.',
    tradeoff: null,
  },
  {
    tier: 'raster',
    label: 'Flatten to images',
    description:
      'Renders every page to a JPEG and rebuilds the document from those.',
    tradeoff:
      'Text stops being selectable or searchable, and quality drops. Best for scans that were images to begin with; a poor trade for a text document.',
  },
];

export interface CompressionResult {
  bytes: Uint8Array;
  before: number;
  after: number;
  /** Negative when the output grew, which the raster tier can do. */
  savedPercent: number;
}

/**
 * The safe tier: no visual change at all.
 *
 * Copying pages into a fresh document leaves orphaned objects behind, and
 * object streams pack the remaining dictionaries together. Typical saving is
 * a few percent, occasionally more on a document that has been edited and
 * re-saved many times.
 */
async function restructure(
  state: PdfEditorState,
  exportPdf: (state: PdfEditorState) => Promise<Uint8Array>
): Promise<Uint8Array> {
  const bytes = await exportPdf(state);
  const { PDFDocument } = await loadPdfLib();

  const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const rebuilt = await PDFDocument.create();
  const copied = await rebuilt.copyPages(source, source.getPageIndices());
  for (const page of copied) rebuilt.addPage(page);

  return rebuilt.save({ useObjectStreams: true });
}

/**
 * The nuclear tier: every page becomes a JPEG.
 *
 * Genuinely effective on scans and genuinely destructive on anything else,
 * which is why the dialog says so rather than presenting it as a free win.
 */
async function rasterize(
  state: PdfEditorState,
  dpi: number,
  quality: number,
  onProgress?: (done: number, total: number) => void
): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.create();

  const total = state.pages.length;
  for (const [index, entry] of state.pages.entries()) {
    const size = state.sources[entry.sourceId]?.pageSizes[entry.sourceIndex];
    const page = await getPage(entry.sourceId, entry.sourceIndex);
    if (!page || !size) continue;

    const rotation = effectiveRotation(entry, size);
    const scale = dpi / 72;
    const viewport = page.getViewport({ scale, rotation });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) continue;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvas, viewport }).promise;
    page.cleanup();

    const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (!blob) continue;

    const image = await doc.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    const width = viewport.width / scale;
    const height = viewport.height / scale;
    const added = doc.addPage([width, height]);
    added.drawImage(image, { x: 0, y: 0, width, height });

    onProgress?.(index + 1, total);
  }

  return doc.save({ useObjectStreams: true });
}

export async function compress(
  state: PdfEditorState,
  tier: CompressionTier,
  options: {
    dpi?: number;
    quality?: number;
    exportPdf: (state: PdfEditorState) => Promise<Uint8Array>;
    onProgress?: (done: number, total: number) => void;
  }
): Promise<CompressionResult> {
  const original = await options.exportPdf(state);

  const bytes =
    tier === 'raster'
      ? await rasterize(
          state,
          options.dpi ?? 150,
          options.quality ?? 0.7,
          options.onProgress
        )
      : await restructure(state, options.exportPdf);

  return {
    bytes,
    before: original.byteLength,
    after: bytes.byteLength,
    savedPercent: Math.round(
      ((original.byteLength - bytes.byteLength) / original.byteLength) * 100
    ),
  };
}

/** Renders each page to an image, for "PDF to PNG/JPG". */
export async function pagesToImages(
  state: PdfEditorState,
  format: 'image/png' | 'image/jpeg',
  dpi = 150,
  quality = 0.92
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const results: { name: string; bytes: Uint8Array }[] = [];
  const extension = format === 'image/png' ? 'png' : 'jpg';
  const stem = state.exportSettings.filename.replace(/\.pdf$/i, '');
  const width = String(state.pages.length).length;

  for (const [index, entry] of state.pages.entries()) {
    const size = state.sources[entry.sourceId]?.pageSizes[entry.sourceIndex];
    const page = await getPage(entry.sourceId, entry.sourceIndex);
    if (!page || !size) continue;

    const viewport = page.getViewport({
      scale: dpi / 72,
      rotation: effectiveRotation(entry, size),
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) continue;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvas, viewport }).promise;
    page.cleanup();

    const blob = await canvasToBlob(canvas, format, quality);
    if (!blob) continue;

    results.push({
      name: `${stem}-${String(index + 1).padStart(width, '0')}.${extension}`,
      bytes: new Uint8Array(await blob.arrayBuffer()),
    });
  }

  return results;
}

/** Builds a PDF from images, one page per image, sized to the image. */
export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.create();

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());

    let image;
    if (file.type === 'image/jpeg') {
      image = await doc.embedJpg(bytes);
    } else if (file.type === 'image/png') {
      image = await doc.embedPng(bytes);
    } else {
      // Anything else the browser can decode goes through a canvas, since
      // pdf-lib embeds only JPEG and PNG.
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
      bitmap.close();
      const blob = await canvasToBlob(canvas, 'image/png');
      if (!blob) continue;
      image = await doc.embedPng(new Uint8Array(await blob.arrayBuffer()));
    }

    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }

  if (doc.getPageCount() === 0) {
    throw new Error('None of those files could be read as images.');
  }
  return doc.save();
}
