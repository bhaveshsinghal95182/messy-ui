/**
 * The one and only entry point to pdf.js.
 *
 * pdfjs-dist v6 is ESM-only and touches browser globals (`DOMMatrix`,
 * `ImageData`, `Path2D`) at module scope, so it must never enter the server
 * module graph — importing it from anything Next renders on the server fails
 * the production build. Everything therefore goes through `loadPdfjs()`, which
 * is a dynamic import behind a memo, and every caller sits inside a
 * `'use client'` component mounted with `dynamic(..., { ssr: false })`.
 *
 * An ESLint `no-restricted-imports` rule keeps `pdfjs-dist` out of every other
 * file so this invariant cannot quietly rot.
 */

import type * as PdfjsLib from 'pdfjs-dist';
import type { DocumentInitParameters } from 'pdfjs-dist/types/src/display/api';
import { PDFJS_ASSETS } from './constants';

export type PdfjsModule = typeof PdfjsLib;

let modulePromise: Promise<PdfjsModule> | null = null;

/**
 * Loads pdf.js once per session and points it at the worker copied into
 * `public/pdfjs` at install time.
 *
 * The worker is referenced by plain URL rather than
 * `new Worker(new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url))`
 * because that form depends on the bundler resolving a bare specifier inside
 * `new URL`. Turbopack — the only bundler in Next 16 — handles that
 * conservatively, and it can behave differently between `next dev` and
 * `next build`. A string path into `public/` behaves identically in both.
 */
export const loadPdfjs = (): Promise<PdfjsModule> => {
  // The **legacy** build, and this is not a stylistic choice. pdfjs-dist v6's
  // modern build calls `Map.prototype.getOrInsertComputed`, a TC39 proposal
  // method that only reached V8 in Chrome 143 — on anything older the very
  // first `page.render()` throws "getOrInsertComputed is not a function" and
  // the page comes out blank while text extraction keeps working, which makes
  // it a confusing failure to diagnose. The legacy build ships the polyfill.
  // Revisit once that method is baseline across supported browsers.
  modulePromise ??= import('pdfjs-dist/legacy/build/pdf.mjs').then(
    async (mod) => {
      const pdfjs = mod as PdfjsModule;
      pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_ASSETS.worker;
      if (process.env.NODE_ENV === 'development') {
        await warnOnVersionSkew(pdfjs.version);
      }
      return pdfjs;
    }
  );
  return modulePromise;
};

/**
 * A worker built from a different release than the API is the most common and
 * least obvious pdf.js failure — it surfaces as blank pages or an opaque
 * "Cannot read properties of undefined". The copy script writes the resolved
 * version alongside the worker so a stale `public/pdfjs` is caught immediately.
 */
async function warnOnVersionSkew(apiVersion: string) {
  try {
    const response = await fetch(PDFJS_ASSETS.version);
    if (!response.ok) return;
    const assetVersion = (await response.text()).trim();
    if (assetVersion && assetVersion !== apiVersion) {
      console.warn(
        `[pdf] worker assets are pdfjs-dist ${assetVersion} but the API is ${apiVersion}. ` +
          'Run `node scripts/copy-static-assets.mjs` to refresh public/pdfjs.'
      );
    }
  } catch {
    // The check is a developer convenience; never let it break loading.
  }
}

/**
 * Base `getDocument` parameters.
 *
 * All four asset URLs must be supplied. In v6 the JBIG2, JPEG 2000 and colour
 * management decoders are WebAssembly and ICC profiles load separately, so
 * omitting any one of them doesn't throw — it just renders a subset of
 * real-world PDFs blank or with wrong colours.
 *
 * Note that `data` is transferred to the worker and the caller's ArrayBuffer is
 * detached as a result — v6 offers no option to opt out of that. Callers must
 * therefore always pass a fresh copy and keep the pristine bytes elsewhere; see
 * `openSource` in `./document`.
 */
export const getDocumentParams = (
  data: Uint8Array,
  password?: string
): DocumentInitParameters => ({
  data,
  password,
  cMapUrl: PDFJS_ASSETS.cMapUrl,
  cMapPacked: true,
  standardFontDataUrl: PDFJS_ASSETS.standardFontDataUrl,
  wasmUrl: PDFJS_ASSETS.wasmUrl,
  iccUrl: PDFJS_ASSETS.iccUrl,
});

/** True when pdf.js rejected a load because it needs (or got a wrong) password. */
export const isPasswordException = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  (error as { name: string }).name === 'PasswordException';

/** True for the benign rejection every cancelled `RenderTask` produces. */
export const isRenderingCancelled = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  (error as { name: string }).name === 'RenderingCancelledException';
