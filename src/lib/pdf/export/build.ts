/**
 * The export pipeline: editor state in, PDF bytes out.
 *
 * Written as a pure `(state, options) => Promise<Uint8Array>` function with no
 * React and no DOM dependencies beyond what pdf-lib itself needs, so it can be
 * moved to a worker later without touching any UI.
 */

import type { PDFDocument, PDFPage, degrees as Degrees } from '@cantoo/pdf-lib';
import { BLANK_SOURCE_ID, isBlankPage } from '../pages/ops';
import { createDrawContext, drawObjects } from './draw-objects';
import { addAnnotations } from './annotations';
import {
  drawRedactedPage,
  pagesNeedingRedaction,
  rasterizeRedactedPage,
} from '../ops/redact';
import { applyFormValues } from '../ops/forms';
import { applyOcrLayer } from '../ocr/text-layer';
import type { OcrPageResult } from '../ocr/ocr';
import { toQuadrant } from '../geometry';
import type {
  ExportSettings,
  PageEntry,
  PdfEditorState,
  PdfSource,
  SourceId,
} from '../types';

/**
 * pdf-lib is a couple of hundred kilobytes and is only needed once the user
 * actually exports, so it is loaded on demand rather than imported at module
 * scope. Memoised because export is usually repeated.
 */
type PdfLibModule = typeof import('@cantoo/pdf-lib');

let pdfLibPromise: Promise<PdfLibModule> | null = null;
export const loadPdfLib = () => {
  pdfLibPromise ??= import('@cantoo/pdf-lib');
  return pdfLibPromise;
};

export interface ExportOptions {
  /** Restrict the export to these page entries, in this order (for split). */
  pages?: PageEntry[];
  settings?: Partial<ExportSettings>;
  /**
   * Recognised text to write back as an invisible layer. Passed in rather than
   * held in state because OCR results are large and transient — the user
   * either exports them straight away or discards them.
   */
  ocr?: OcrPageResult[];
}

/**
 * True when the document can be written back by mutating the original file
 * rather than rebuilding it from copied pages.
 *
 * The distinction matters more than it looks. `copyPages` carries a page's
 * content and its widget annotations, but *not* the AcroForm field tree, the
 * document outline, named destinations or cross-page links — so rebuilding a
 * document that did not need rebuilding silently throws away its bookmarks and
 * interactive form. The in-place path preserves all of it.
 */
export function canExportInPlace(
  state: PdfEditorState,
  pages: PageEntry[]
): boolean {
  // A redacted page is replaced by a flattened image, which means building a
  // new document — there is no in-place edit that removes the original content
  // with the certainty redaction requires.
  if (pagesNeedingRedaction(state).size > 0) return false;

  const sourceIds = new Set(pages.map((page) => page.sourceId));
  if (sourceIds.size !== 1) return false;

  const [sourceId] = [...sourceIds];
  if (sourceId === BLANK_SOURCE_ID) return false;

  const source = state.sources[sourceId];
  if (!source) return false;

  // Same pages, same order, none dropped or duplicated.
  if (pages.length !== source.pageCount) return false;
  return pages.every(
    (page, index) => page.sourceIndex === index && page.crop === null
  );
}

/** Loads a source with pdf-lib, supplying its password when it has one. */
async function loadSourceDocument(source: PdfSource): Promise<PDFDocument> {
  const { PDFDocument } = await loadPdfLib();
  return PDFDocument.load(source.bytes, {
    password: source.password ?? undefined,
    // Some real-world files declare encryption they don't actually apply;
    // without this pdf-lib refuses them outright.
    ignoreEncryption: source.password === null,
  });
}

/** Applies rotation and crop, which are per-entry rather than per-source. */
function applyPageGeometry(
  page: PDFPage,
  entry: PageEntry,
  degrees: typeof Degrees
) {
  if (entry.rotation !== 0) {
    // getRotation() returns the page's own /Rotate; the entry's rotation is
    // additional, so the two compose rather than replace.
    const current = page.getRotation().angle;
    page.setRotation(degrees(toQuadrant(current + entry.rotation)));
  }

  if (entry.crop) {
    const { x, y, w, h } = entry.crop;
    page.setCropBox(x, y, w, h);
  }
}

/**
 * Builds the exported document.
 *
 * Sources are loaded once and their copy results cached: `copyPages` is the
 * expensive step, and a merge of two files or a duplicate of one page would
 * otherwise re-parse the same document repeatedly.
 */
export async function exportPdf(
  state: PdfEditorState,
  options: ExportOptions = {}
): Promise<Uint8Array> {
  const { PDFDocument, degrees } = await loadPdfLib();
  const pages = options.pages ?? state.pages;
  const settings = { ...state.exportSettings, ...options.settings };

  if (pages.length === 0) {
    throw new Error('There are no pages to export.');
  }

  let doc: PDFDocument;
  /** Exported page index -> the entry it came from, for drawing annotations. */
  const drawn: { page: PDFPage; entry: PageEntry }[] = [];
  const redactedPages = pagesNeedingRedaction(state);

  if (canExportInPlace(state, pages)) {
    doc = await loadSourceDocument(state.sources[pages[0].sourceId]);
    pages.forEach((entry, index) => {
      const page = doc.getPage(index);
      applyPageGeometry(page, entry, degrees);
      drawn.push({ page, entry });
    });
  } else {
    doc = await PDFDocument.create();

    // Cache per source so a 3-page merge parses each file once.
    const loaded = new Map<SourceId, PDFDocument>();
    const loadOnce = async (sourceId: SourceId) => {
      const cached = loaded.get(sourceId);
      if (cached) return cached;
      const source = state.sources[sourceId];
      if (!source) throw new Error(`Missing source for page ${sourceId}`);
      const document = await loadSourceDocument(source);
      loaded.set(sourceId, document);
      return document;
    };

    for (const entry of pages) {
      if (isBlankPage(entry)) {
        const blank = entry as PageEntry & {
          blankSize?: { width: number; height: number };
        };
        const page = doc.addPage([
          blank.blankSize?.width ?? 612,
          blank.blankSize?.height ?? 792,
        ]);
        drawn.push({ page, entry });
        continue;
      }

      // A redacted page never gets copied: it is replaced by an image of
      // itself with the redactions burned into the pixels, so the original
      // text is not present in the output at all.
      if (redactedPages.has(entry.id)) {
        const raster = await rasterizeRedactedPage(state, entry);
        if (raster) {
          await drawRedactedPage(doc, doc.getPageCount(), raster);
          drawn.push({ page: doc.getPage(doc.getPageCount() - 1), entry });
          continue;
        }
        // Rasterising failed: refuse rather than silently exporting a document
        // whose redactions did not take effect.
        throw new Error(
          'A redacted page could not be flattened, so the export was stopped ' +
            'rather than saving a file where the redaction had no effect.'
        );
      }

      const sourceDoc = await loadOnce(entry.sourceId);
      const [copied] = await doc.copyPages(sourceDoc, [entry.sourceIndex]);
      applyPageGeometry(copied, entry, degrees);
      doc.addPage(copied);
      drawn.push({ page: copied, entry });
    }
  }

  // Annotations are painted after every page exists, so the fonts and images
  // they need are embedded once for the whole document rather than per page.
  const annotated = drawn.filter(
    ({ entry }) => (state.objects[entry.id]?.length ?? 0) > 0
  );
  if (annotated.length > 0) {
    const lib = await loadPdfLib();
    const context = await createDrawContext(lib, doc);
    // A link to a page has to resolve to the ref of the *exported* page, which
    // is not the same page as the one the user clicked once pages have been
    // reordered, deleted or merged in from another file.
    const refByPageId = new Map(
      drawn.map(({ page, entry }) => [entry.id, page.ref])
    );
    const resolvePageRef = (pageId: string) => refByPageId.get(pageId);

    for (const { page, entry } of annotated) {
      const objects = state.objects[entry.id];
      await drawObjects(context, page, objects);
      addAnnotations(lib, doc, page, objects, resolvePageRef);
    }
  }

  // The invisible OCR layer goes on before anything is flattened, so the words
  // land over the page image rather than under a later replacement.
  if (options.ocr?.length) {
    const pageIndexById = new Map(
      drawn.map(({ entry }, index) => [entry.id, index])
    );
    await applyOcrLayer(await loadPdfLib(), doc, options.ocr, pageIndexById);
  }

  // Form values are written before metadata so a flatten, which turns fields
  // into page content, happens while the document is still otherwise intact.
  await applyFormValues(doc, state.forms, settings.flattenForms);

  applyMetadata(doc, state, settings);

  if (settings.stripMetadata) {
    sanitizeCatalog(doc, await loadPdfLib());
  }

  if (settings.encryption) {
    const { userPassword, ownerPassword, permissions } = settings.encryption;
    doc.encrypt({
      userPassword: userPassword || undefined,
      ownerPassword: ownerPassword || undefined,
      permissions,
    });
  }

  return doc.save({
    // Object streams shrink the file, but must be off for a document that is
    // about to be signed — see sign/sign.ts.
    useObjectStreams: settings.optimize !== 'none',
  });
}

/**
 * Strips document-level JavaScript, launch actions and embedded attachments.
 *
 * These live in the catalog's /Names tree and /OpenAction, and none of them are
 * things a user re-sharing a document expects to be passing along — an embedded
 * script runs on open in readers that support it, and an attachment can be an
 * entire second file riding along invisibly.
 */
function sanitizeCatalog(doc: PDFDocument, lib: PdfLibModule) {
  const { PDFName, PDFDict } = lib;
  const catalog = doc.catalog;

  // An action that fires the moment the document opens.
  catalog.delete(PDFName.of('OpenAction'));
  catalog.delete(PDFName.of('AA'));

  // lookupMaybe: the typed `lookup` throws rather than returning undefined
  // when the key is absent, and most documents have no /Names tree at all.
  const names = catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
  if (names) {
    // Document-level JavaScript, and the embedded-file tree.
    names.delete(PDFName.of('JavaScript'));
    names.delete(PDFName.of('EmbeddedFiles'));
  }
}

function applyMetadata(
  doc: PDFDocument,
  state: PdfEditorState,
  settings: ExportSettings
) {
  if (settings.stripMetadata) {
    doc.setTitle('');
    doc.setAuthor('');
    doc.setSubject('');
    doc.setKeywords([]);
    doc.setProducer('');
    doc.setCreator('');
    return;
  }

  const { metadata } = state;
  if (metadata.title) doc.setTitle(metadata.title);
  if (metadata.author) doc.setAuthor(metadata.author);
  if (metadata.subject) doc.setSubject(metadata.subject);
  if (metadata.keywords) {
    doc.setKeywords(
      metadata.keywords
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    );
  }
  if (metadata.creator) doc.setCreator(metadata.creator);
}
