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
    const context = await createDrawContext(await loadPdfLib(), doc);
    for (const { page, entry } of annotated) {
      await drawObjects(context, page, state.objects[entry.id]);
    }
  }

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

  const names = catalog.lookup(PDFName.of('Names'), PDFDict);
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
