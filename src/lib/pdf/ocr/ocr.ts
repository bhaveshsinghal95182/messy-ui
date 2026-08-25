/**
 * Reading text off a scanned page.
 *
 * A scan is a picture of a document: there are no text objects in the file, so
 * nothing to select, search or extract. OCR recognises the words from the
 * pixels and writes them back as an *invisible* text layer sitting exactly
 * over the printed ones, which is what makes a scan searchable without
 * changing how it looks.
 *
 * Everything is self-hosted. tesseract.js otherwise fetches its WASM core and
 * language model from jsDelivr on first use, and a tool that promises no
 * third-party requests should not quietly make one.
 */

import { getPage } from '../render';
import { effectiveRotation } from '../document';
import { OCR_DPI } from '../constants';
import type { PageEntry, PdfEditorState } from '../types';

/** A recognised word and where it sits, in image pixels. */
export interface OcrWord {
  text: string;
  confidence: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface OcrPageResult {
  pageId: string;
  words: OcrWord[];
  /** The rendered page size in pixels, for converting boxes back to points. */
  imageWidth: number;
  imageHeight: number;
  /** Page size in PDF points. */
  pageWidth: number;
  pageHeight: number;
}

/** Where the asset script put the core, the worker and the language model. */
const TESSERACT_PATHS = {
  workerPath: '/tesseract/worker.min.js',
  corePath: '/tesseract',
  langPath: '/tesseract/lang',
} as const;

/** tesseract.js is several megabytes, so it loads only when OCR is run. */
let tesseractPromise: Promise<typeof import('tesseract.js')> | null = null;
const loadTesseract = () => {
  tesseractPromise ??= import('tesseract.js');
  return tesseractPromise;
};

export interface OcrOptions {
  /** Page entries to read. Defaults to every page. */
  pages?: PageEntry[];
  /** Words below this confidence are dropped rather than polluting search. */
  minConfidence?: number;
  onProgress?: (done: number, total: number, status: string) => void;
  signal?: AbortSignal;
}

/**
 * Recognises text on the given pages.
 *
 * One worker is created for the whole run and terminated at the end: spinning
 * one up per page would re-load the language model every time, which dominates
 * the cost of OCRing a short document.
 */
export async function recognizePages(
  state: PdfEditorState,
  options: OcrOptions = {}
): Promise<OcrPageResult[]> {
  const { createWorker } = await loadTesseract();
  const pages = options.pages ?? state.pages;
  const minConfidence = options.minConfidence ?? 40;

  options.onProgress?.(0, pages.length, 'Loading the language model');

  const worker = await createWorker('eng', 1, {
    ...TESSERACT_PATHS,
    // Silences tesseract's own console chatter; progress is reported above.
    logger: () => {},
  });

  const results: OcrPageResult[] = [];

  try {
    for (const [index, entry] of pages.entries()) {
      if (options.signal?.aborted) break;

      const size = state.sources[entry.sourceId]?.pageSizes[entry.sourceIndex];
      const page = await getPage(entry.sourceId, entry.sourceIndex);
      if (!page || !size) continue;

      options.onProgress?.(index, pages.length, `Reading page ${index + 1}`);

      // 300 DPI is the conventional floor for OCR; below it, small type starts
      // to lose the strokes that distinguish similar glyphs.
      const scale = OCR_DPI / 72;
      const viewport = page.getViewport({
        scale,
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

      const { data } = await worker.recognize(
        canvas,
        {},
        { blocks: true, text: true }
      );

      const words: OcrWord[] = [];
      for (const block of data.blocks ?? []) {
        for (const paragraph of block.paragraphs ?? []) {
          for (const line of paragraph.lines ?? []) {
            for (const word of line.words ?? []) {
              if (!word.text.trim() || word.confidence < minConfidence)
                continue;
              words.push({
                text: word.text,
                confidence: word.confidence,
                left: word.bbox.x0,
                top: word.bbox.y0,
                right: word.bbox.x1,
                bottom: word.bbox.y1,
              });
            }
          }
        }
      }

      results.push({
        pageId: entry.id,
        words,
        imageWidth: canvas.width,
        imageHeight: canvas.height,
        pageWidth: viewport.width / scale,
        pageHeight: viewport.height / scale,
      });

      options.onProgress?.(index + 1, pages.length, `Read page ${index + 1}`);
    }
  } finally {
    await worker.terminate();
  }

  return results;
}

/** All recognised text, for showing the user what was found. */
export const resultText = (results: OcrPageResult[]): string =>
  results
    .map((result, index) =>
      [
        `--- Page ${index + 1} ---`,
        '',
        result.words.map((w) => w.text).join(' '),
      ].join('\n')
    )
    .join('\n\n');
