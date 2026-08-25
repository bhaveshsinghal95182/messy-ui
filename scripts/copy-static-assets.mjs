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

await copyPdfjs();
