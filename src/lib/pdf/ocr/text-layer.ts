/**
 * Writing recognised words back as invisible text.
 *
 * The trick that makes an OCR'd scan searchable without changing how it looks:
 * each word is drawn in text rendering mode 3 — "neither fill nor stroke" — at
 * the position the recogniser found it. The glyphs are laid out and indexed
 * like any other text, so selection, Ctrl+F and extraction all work, but
 * nothing is painted, so the page still shows only the original scan.
 *
 * Getting the *geometry* right is what separates a usable text layer from an
 * irritating one. If the invisible glyphs do not sit over the printed ones,
 * selecting a word highlights empty space next to it.
 */

import type { PDFDocument, PDFFont, PDFPage } from '@cantoo/pdf-lib';
import type { OcrPageResult } from './ocr';

type PdfLib = typeof import('@cantoo/pdf-lib');

/**
 * Draws one page's recognised words as invisible text.
 *
 * Two adjustments make the glyphs line up with the image:
 *
 * - **Size** comes from the box height. A cap-height of roughly 0.72 em is a
 *   fair approximation for Helvetica, so the font size is the box height
 *   divided by that.
 * - **Horizontal scale** (the `Tz` operator) squeezes or stretches each word so
 *   its rendered width matches the width the recogniser measured. Without it,
 *   the metrics of the substitute font drift away from the scanned typeface and
 *   selections end up offset by a word or more across a line.
 */
export function drawInvisibleText(
  lib: PdfLib,
  page: PDFPage,
  font: PDFFont,
  result: OcrPageResult
): void {
  const {
    beginText,
    endText,
    popGraphicsState,
    pushGraphicsState,
    setFontAndSize,
    setTextMatrix,
    setTextRenderingMode,
    setCharacterSqueeze,
    showText,
    TextRenderingMode,
  } = lib;

  // Register the font on this page once, not per word: `pushOperators` writes
  // raw content-stream operators, which reference a font by its resource name,
  // so the font must exist in the page's resource dictionary first.
  const fontKey = page.node.newFontDictionary(font.name, font.ref);

  // Image pixels to PDF points.
  const scaleX = result.pageWidth / result.imageWidth;
  const scaleY = result.pageHeight / result.imageHeight;

  for (const word of result.words) {
    const text = word.text;
    if (!text.trim()) continue;

    const boxWidth = (word.right - word.left) * scaleX;
    const boxHeight = (word.bottom - word.top) * scaleY;
    if (boxWidth <= 0 || boxHeight <= 0) continue;

    const size = boxHeight / 0.72;

    // The recogniser reports a top-left origin; PDF text sits on a baseline
    // measured from the bottom of the page.
    const x = word.left * scaleX;
    const baseline = result.pageHeight - word.bottom * scaleY;

    let encoded;
    try {
      encoded = font.encodeText(text);
    } catch {
      // A word with characters the standard font cannot encode is skipped
      // rather than failing the page.
      continue;
    }

    const measured = font.widthOfTextAtSize(text, size);
    const squeeze = measured > 0 ? (boxWidth / measured) * 100 : 100;

    page.pushOperators(
      pushGraphicsState(),
      beginText(),
      setTextRenderingMode(TextRenderingMode.Invisible),
      setFontAndSize(fontKey, size),
      setCharacterSqueeze(clamp(squeeze, 10, 1000)),
      setTextMatrix(1, 0, 0, 1, x, baseline),
      showText(encoded),
      endText(),
      popGraphicsState()
    );
  }
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Adds an invisible text layer to every page that has OCR results.
 *
 * Returns the number of words written, so the UI can report something more
 * useful than "done".
 */
export async function applyOcrLayer(
  lib: PdfLib,
  doc: PDFDocument,
  results: OcrPageResult[],
  pageIndexById: Map<string, number>
): Promise<number> {
  if (results.length === 0) return 0;

  const font = await doc.embedFont(lib.StandardFonts.Helvetica);
  let written = 0;

  for (const result of results) {
    const index = pageIndexById.get(result.pageId);
    if (index === undefined) continue;
    const page = doc.getPage(index);
    if (!page) continue;

    drawInvisibleText(lib, page, font, result);
    written += result.words.length;
  }

  return written;
}
