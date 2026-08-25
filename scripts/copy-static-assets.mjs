/**
 * Copies the runtime assets the PDF tool needs out of node_modules and into
 * public/, so they are served from our own origin.
 *
 * Two reasons this is a build step rather than a bundler import:
 *
 * 1. pdf.js resolves its worker, cmaps, standard fonts, WASM decoders and ICC
 *    profiles from URLs at runtime, not through the module graph. Turbopack has
 *    no reliable way to emit a bare-specifier `new URL(...)` asset reference, so
 *    a plain string path into public/ is the only wiring that behaves the same
 *    in `next dev` and `next build`.
 * 2. Nothing about the PDF tool may hit a third-party CDN. The whole promise is
 *    that the document never leaves the device; fetching decoders from jsDelivr
 *    while making that claim would be dishonest.
 *
 * Runs on postinstall, predev and prebuild. The output is gitignored.
 */

import { createRequire } from 'node:module';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();

/** Resolves a package's root directory from its package.json. */
const packageRoot = (name) =>
  path.dirname(require.resolve(`${name}/package.json`));

const copyInto = async (from, to) => {
  if (!existsSync(from)) {
    console.warn(`[copy-static-assets] missing, skipped: ${from}`);
    return false;
  }
  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
  return true;
};

async function copyPdfjs() {
  const src = packageRoot('pdfjs-dist');
  const dest = path.join(root, 'public', 'pdfjs');

  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });

  // The legacy build, deliberately — see the note in src/lib/pdf/pdfjs.ts. The
  // worker must come from the same build as the API or they refuse to talk.
  await copyInto(
    path.join(src, 'legacy', 'build', 'pdf.worker.min.mjs'),
    path.join(dest, 'pdf.worker.min.mjs')
  );

  // pdfjs-dist v6 needs all four: JBIG2/JPX/QCMS moved to WASM, and ICC
  // profiles are loaded separately. Omitting any of them silently breaks a
  // subset of real-world PDFs rather than throwing.
  for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
    await copyInto(path.join(src, dir), path.join(dest, dir));
  }

  // Read back at runtime in development to catch a worker/API version skew,
  // which is the most common and most confusing pdf.js-in-Next failure.
  const { version } = require('pdfjs-dist/package.json');
  await writeFile(path.join(dest, 'version.txt'), version, 'utf8');

  console.log(`[copy-static-assets] pdfjs-dist ${version} -> public/pdfjs`);
}

/**
 * Tesseract's WASM core and its English language model.
 *
 * Self-hosted rather than left to tesseract.js's default, which fetches both
 * from jsDelivr at runtime. The whole promise of this tool is that using it
 * makes no third-party requests; quietly pulling a 3 MB model from a CDN the
 * moment someone OCRs a document would break that, even though the document
 * itself never moves.
 *
 * The "best_int" model is used over the standard one: 2.9 MB against 10.9 MB
 * for accuracy that is indistinguishable on ordinary documents.
 */
async function copyTesseract() {
  const dest = path.join(root, 'public', 'tesseract');
  await rm(dest, { recursive: true, force: true });
  await mkdir(path.join(dest, 'lang'), { recursive: true });

  const core = packageRoot('tesseract.js-core');

  // All three LSTM variants, because tesseract.js feature-detects at runtime
  // and asks for whichever the browser supports — copying only one means the
  // request 404s on machines that support a different level, which surfaces as
  // an opaque "failed to execute importScripts".
  //
  // Only the "-lstm" builds are shipped: they drop the legacy pre-4.0 engine,
  // which nothing here uses, and halve the size. The threaded builds are
  // deliberately excluded — they need SharedArrayBuffer, which needs COOP/COEP
  // headers, which would break analytics, web fonts and every cross-origin
  // image on the rest of the site.
  for (const variant of ['', '-simd', '-relaxedsimd']) {
    for (const extension of ['.js', '.wasm', '.wasm.js']) {
      const file = `tesseract-core${variant}-lstm${extension}`;
      await copyInto(path.join(core, file), path.join(dest, file));
    }
  }

  const worker = path.join(
    packageRoot('tesseract.js'),
    'dist',
    'worker.min.js'
  );
  await copyInto(worker, path.join(dest, 'worker.min.js'));

  const lang = packageRoot('@tesseract.js-data/eng');
  await copyInto(
    path.join(lang, '4.0.0_best_int', 'eng.traineddata.gz'),
    path.join(dest, 'lang', 'eng.traineddata.gz')
  );

  console.log('[copy-static-assets] tesseract core + eng -> public/tesseract');
}

await copyPdfjs();
await copyTesseract();
