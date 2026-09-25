/**
 * Opening files and owning the live pdf.js document proxies.
 *
 * The proxies live in a module-level map rather than in React state on purpose:
 * they are mutable, imperative handles with their own lifecycle, and putting
 * them in state would both fight the React Compiler's immutability assumptions
 * and leak workers when a component unmounts mid-render.
 */

import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { getDocumentParams, isPasswordException, loadPdfjs } from './pdfjs';
import { newId } from './reducer';
import type {
  PageEntry,
  PageSize,
  PdfSource,
  Quadrant,
  SourceId,
} from './types';

/**
 * Both halves are kept: `proxy` is what callers read pages from, but only the
 * loading task can tear the worker down — `PDFDocumentProxy` exposes
 * `cleanup()` (which frees page resources) and no `destroy()`.
 */
interface OpenDocument {
  proxy: PDFDocumentProxy;
  task: PDFDocumentLoadingTask;
}

const documents = new Map<SourceId, OpenDocument>();

/** Thrown when a file needs a password we don't have (or was given a wrong one). */
export class PdfPasswordRequiredError extends Error {
  constructor(
    readonly file: File,
    readonly wasWrong: boolean
  ) {
    super(wasWrong ? 'Incorrect password' : 'Password required');
    this.name = 'PdfPasswordRequiredError';
  }
}

export const getDocument = (sourceId: SourceId): PDFDocumentProxy | undefined =>
  documents.get(sourceId)?.proxy;

/**
 * Reads a File into a `PdfSource` and registers its pdf.js proxy.
 *
 * The pristine bytes are kept for pdf-lib and a **copy** is handed to pdf.js.
 * That copy is not defensive style — `getDocument({ data })` transfers the
 * ArrayBuffer to the worker, which detaches it on this thread. Passing the
 * pristine array would leave `source.bytes` a zero-length husk, and the failure
 * shows up much later as "export worked the first time and now throws".
 */
export async function openSource(
  file: File,
  password?: string
): Promise<PdfSource> {
  const pristine = new Uint8Array(await file.arrayBuffer());
  const pdfjs = await loadPdfjs();

  const id = newId();
  const task = pdfjs.getDocument(getDocumentParams(pristine.slice(), password));

  let proxy: PDFDocumentProxy;
  try {
    proxy = await task.promise;
  } catch (error) {
    await task.destroy();
    if (isPasswordException(error)) {
      throw new PdfPasswordRequiredError(file, password !== undefined);
    }
    throw error;
  }

  const pageSizes = await readPageSizes(proxy);
  documents.set(id, { proxy, task });

  return {
    id,
    name: file.name,
    bytes: pristine,
    byteLength: pristine.byteLength,
    encrypted: password !== undefined,
    password: password ?? null,
    pageCount: proxy.numPages,
    pageSizes,
  };
}

/**
 * Page dimensions, read once at open time.
 *
 * Having these up front is what lets the scroll list compute every page's
 * offset without measuring the DOM, which is the basis of virtualisation.
 */
async function readPageSizes(proxy: PDFDocumentProxy): Promise<PageSize[]> {
  const sizes: PageSize[] = [];
  for (let pageNumber = 1; pageNumber <= proxy.numPages; pageNumber += 1) {
    const page = await proxy.getPage(pageNumber);
    // An unrotated, unscaled viewport reports the CropBox in points, which is
    // the coordinate space every stored object rect is expressed in.
    const viewport = page.getViewport({ scale: 1, rotation: 0 });
    sizes.push({
      width: viewport.width,
      height: viewport.height,
      rotation: (((page.rotate % 360) + 360) % 360) as Quadrant,
    });
    page.cleanup();
  }
  return sizes;
}

/** One `PageEntry` per page of a freshly opened source, in document order. */
export const entriesForSource = (source: PdfSource): PageEntry[] =>
  Array.from({ length: source.pageCount }, (_, index) => ({
    id: newId(),
    sourceId: source.id,
    sourceIndex: index,
    rotation: 0 as Quadrant,
    crop: null,
  }));

/** Releases a source's worker and page cache. Safe to call twice. */
export async function closeSource(sourceId: SourceId): Promise<void> {
  const open = documents.get(sourceId);
  if (!open) return;
  documents.delete(sourceId);
  try {
    await open.proxy.cleanup();
    await open.task.destroy();
  } catch {
    // Tearing down an already-destroyed document is not worth surfacing.
  }
}

export async function closeAllSources(): Promise<void> {
  await Promise.all([...documents.keys()].map(closeSource));
}

/**
 * The effective on-screen rotation of a page: its own /Rotate plus whatever the
 * user has added. pdf.js applies this whole value when building a viewport.
 */
export const effectiveRotation = (
  entry: PageEntry,
  size: PageSize | undefined
): number => ((size?.rotation ?? 0) + entry.rotation) % 360;
