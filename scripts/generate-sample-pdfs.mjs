/**
 * Generates PDF fixtures for the smoke run, offline.
 *
 * Written with the same library the editor exports with, so a fixture that
 * loads here is one the export path can also produce. Output goes to
 * `tmp-samples/`, which is gitignored.
 *
 * Usage: node scripts/generate-sample-pdfs.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, degrees, rgb } from '@cantoo/pdf-lib';

const outDir = path.join(process.cwd(), 'tmp-samples');

/** Known text the smoke run greps for after a round trip. */
export const MARKER = 'MESSYUI-SMOKE-MARKER';

async function textDocument() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let index = 0; index < 3; index += 1) {
    const page = doc.addPage([612, 792]);
    page.drawText(`Page ${index + 1}`, {
      x: 72,
      y: 700,
      size: 28,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(index === 0 ? MARKER : `Body text for page ${index + 1}.`, {
      x: 72,
      y: 650,
      size: 12,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  doc.setTitle('Smoke test document');
  doc.setAuthor('messy-ui');
  return doc.save();
}

/**
 * The coordinate-math torture test: every rotation, plus a MediaBox that does
 * not start at the origin and a CropBox smaller than it. Anything that assumes
 * pages start at (0,0) and are unrotated gets this wrong.
 */
async function rotatedDocument() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const rotation of [0, 90, 180, 270]) {
    const page = doc.addPage([612, 792]);
    page.setRotation(degrees(rotation));
    page.drawText(`Rotated ${rotation}`, { x: 100, y: 400, size: 24, font });
  }

  const offset = doc.addPage([612, 792]);
  offset.setMediaBox(20, 30, 612, 792);
  offset.setCropBox(40, 50, 500, 700);
  offset.drawText('Offset media box', { x: 120, y: 400, size: 18, font });

  return doc.save();
}

async function largeDocument(pageCount = 200) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < pageCount; index += 1) {
    const page = doc.addPage([612, 792]);
    page.drawText(`Page ${index + 1} of ${pageCount}`, {
      x: 72,
      y: 700,
      size: 18,
      font,
    });
  }
  return doc.save();
}

/** A user password makes the file genuinely unopenable without it. */
async function encryptedDocument() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage([612, 792]).drawText('Secret contents', {
    x: 72,
    y: 700,
    size: 20,
    font,
  });
  doc.encrypt({ userPassword: 'test', ownerPassword: 'owner-test' });
  return doc.save();
}

const fixtures = [
  ['text-3page.pdf', textDocument],
  ['rotated.pdf', rotatedDocument],
  ['large-200page.pdf', largeDocument],
  ['encrypted-user.pdf', encryptedDocument],
];

await mkdir(outDir, { recursive: true });
for (const [name, build] of fixtures) {
  const bytes = await build();
  await writeFile(path.join(outDir, name), bytes);
  console.log(`[samples] ${name} (${(bytes.length / 1024).toFixed(1)} KB)`);
}
