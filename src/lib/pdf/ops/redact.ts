/**
 * Redaction that actually removes content.
 *
 * Drawing a black rectangle over text is not redaction. The words stay in the
 * content stream, come straight back out with copy-and-paste or any text
 * extractor, and this mistake has leaked real documents more than once.
 *
 * The only way to be certain in a client-side editor is to destroy the
 * evidence: render the page to pixels with the redaction areas painted opaque,
 * then replace the page with that image. Whatever was underneath no longer
 * exists in the file — there is no text object left to recover.
 *
 * The cost is that the page becomes an image: no selectable text, larger file,
 * no reflow. So only pages that actually carry a redaction are rasterised, and
 * the dialog says plainly what is being traded.
 */

import type { PDFDocument } from '@cantoo/pdf-lib';
import { getPage, canvasToBlob } from '../render';
import { pdfRectToScreen } from '../geometry';
import { effectiveRotation } from '../document';
import { DEFAULT_RASTER_DPI } from '../constants';
import type { PageEntry, PdfEditorState, PdfObject, Rect } from '../types';

/** Pages that need rasterising, i.e. those carrying at least one redaction. */
export const pagesNeedingRedaction = (state: PdfEditorState): Set<string> => {
  const ids = new Set<string>();
  for (const [pageId, objects] of Object.entries(state.objects)) {
    if (objects.some((object) => object.kind === 'redaction')) ids.add(pageId);
  }
  return ids;
};

export const hasRedactions = (state: PdfEditorState): boolean =>
  pagesNeedingRedaction(state).size > 0;

export interface RedactedPage {
  /** JPEG bytes of the flattened page. */
  bytes: Uint8Array;
  /** Original page size in PDF points, so the replacement matches exactly. */
  width: number;
  height: number;
}

/**
 * Renders one page with its redactions burned in.
 *
 * Everything else on the page — annotations, signatures, text objects — is
 * *not* drawn here. Those are applied by the normal export path onto the
 * resulting image page, so an annotation stays editable right up until export
 * and is not silently flattened by an unrelated redaction.
 */
export async function rasterizeRedactedPage(
  state: PdfEditorState,
  entry: PageEntry,
  dpi = DEFAULT_RASTER_DPI,
  quality = 0.85
): Promise<RedactedPage | null> {
  const source = state.sources[entry.sourceId];
  const size = source?.pageSizes[entry.sourceIndex];
  if (!source || !size) return null;

  const rotation = effectiveRotation(entry, size);
  const page = await getPage(entry.sourceId, entry.sourceIndex);
  if (!page) return null;

  const scale = dpi / 72;
  const viewport = page.getViewport({ scale, rotation });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return null;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvas, viewport }).promise;
  page.cleanup();

  // Paint the redactions onto the pixels, after the page has rendered. This is
  // the step that makes the content unrecoverable: from here on the original
  // glyphs exist nowhere in the output.
  context.fillStyle = '#000000';
  for (const object of state.objects[entry.id] ?? []) {
    if (object.kind !== 'redaction') continue;
    const box = pdfRectToScreen(viewport, object.rect);
    context.fillRect(box.left, box.top, box.width, box.height);
  }

  const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  if (!blob) return null;

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width: viewport.width / scale,
    height: viewport.height / scale,
  };
}

/**
 * Draws a rasterised page into a freshly created page of the output document.
 *
 * A *new* page rather than a mutated copy of the original: clearing a copied
 * page's content stream and annotations by hand leaves room for something to
 * survive, and the whole point here is that nothing does. Starting from an
 * empty page of the same size makes that guarantee structural.
 */
export async function drawRedactedPage(
  doc: PDFDocument,
  index: number,
  redacted: RedactedPage
): Promise<void> {
  const image = await doc.embedJpg(redacted.bytes);
  const page = doc.insertPage(index, [redacted.width, redacted.height]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: redacted.width,
    height: redacted.height,
  });
}

/** A redaction's rect, for reporting what will be removed. */
export const redactionRects = (objects: PdfObject[]): Rect[] =>
  objects.filter((object) => object.kind === 'redaction').map((o) => o.rect);
