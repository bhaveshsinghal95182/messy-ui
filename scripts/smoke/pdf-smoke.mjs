/**
 * Browser smoke run for /pdf.
 *
 * The repo has no test framework, and the failures that matter here — the
 * pdf.js worker not resolving, ESM leaking into the server bundle, a canvas
 * that stays blank — only appear in a real browser against a production build.
 * So this drives Chromium directly.
 *
 * Usage:
 *   pnpm build && pnpm start &
 *   node scripts/smoke/pdf-smoke.mjs
 *
 * Playwright is resolved from wherever it happens to be installed rather than
 * added as a dependency; Chromium comes from PLAYWRIGHT_BROWSERS_PATH. Set
 * PLAYWRIGHT_PATH to point at a different install.
 */

import { createRequire } from 'node:module';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * ESM ignores NODE_PATH, so a global Playwright cannot be reached by bare
 * specifier. `createRequire` does honour the usual resolution paths, and the
 * explicit candidates cover the common global prefixes.
 */
const loadPlaywright = async () => {
  const candidates = [
    process.env.PLAYWRIGHT_PATH,
    'playwright',
    '/opt/node22/lib/node_modules/playwright/index.js',
    '/usr/lib/node_modules/playwright/index.js',
    '/usr/local/lib/node_modules/playwright/index.js',
  ].filter(Boolean);

  const require = createRequire(import.meta.url);
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next location.
    }
  }
  throw new Error(
    `Could not find Playwright. Tried: ${candidates.join(', ')}. ` +
      'Set PLAYWRIGHT_PATH to its index.js.'
  );
};

const { chromium } = await loadPlaywright();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const samples = path.join(process.cwd(), 'tmp-samples');
const shots = path.join(samples, 'shots');

const results = [];
let failures = 0;

const check = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  if (!passed) failures += 1;
  console.log(
    `${passed ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`
  );
};

/** True when the canvas has content that isn't just the white page fill. */
const canvasHasInk = (page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas || !canvas.width) return { ok: false, reason: 'no canvas' };
    const context = canvas.getContext('2d');
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let nonWhite = 0;
    // Sample every 40th pixel; text is sparse but far more than 1 in 40 dark.
    for (let i = 0; i < data.length; i += 160) {
      if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200)
        nonWhite += 1;
    }
    return {
      ok: nonWhite > 0,
      reason: `${nonWhite} non-white samples, ${canvas.width}x${canvas.height}`,
    };
  });

/**
 * Decompresses page 1 of a saved PDF and reports what was actually drawn.
 *
 * pdf-lib is already a project dependency, so this reads the output with the
 * same library that wrote it — a round trip through a real parser rather than
 * a substring search over compressed bytes.
 */
const inspectFirstPage = async (file) => {
  const require = createRequire(import.meta.url);
  const { PDFDocument, PDFArray } = require('@cantoo/pdf-lib');
  const zlib = require('node:zlib');

  const doc = await PDFDocument.load(await readFile(file));
  const contents = doc.getPage(0).node.Contents();
  const streams =
    contents instanceof PDFArray
      ? contents.asArray().map((ref) => doc.context.lookup(ref))
      : [contents];

  let body = '';
  for (const stream of streams) {
    const bytes = stream.getContents ? stream.getContents() : stream.contents;
    try {
      body += zlib.inflateSync(Buffer.from(bytes)).toString('latin1');
    } catch {
      body += Buffer.from(bytes).toString('latin1');
    }
  }

  // XObject names contain hyphens, so the name class has to allow them.
  const imageOps = (body.match(/\/[\w-]+ Do/g) ?? []).join(', ');

  // pdf-lib writes strings hex-encoded, e.g. <3235204175677573742e> Tj.
  const text = (body.match(/<([0-9A-Fa-f]+)> Tj/g) ?? [])
    .map((match) =>
      Buffer.from(match.slice(1, match.indexOf('>')), 'hex').toString('latin1')
    )
    .join(' ');

  return { hasImageDraw: imageOps.length > 0, imageOps, text };
};

/**
 * Reports whether a saved PDF is actually encrypted, and whether the expected
 * password opens it.
 *
 * Checking that a password *works* is not enough on its own — an unencrypted
 * file "opens" too. The meaningful assertion is that the document reports
 * itself encrypted and refuses to load without the password.
 */
const isEncrypted = async (file, password = 'smoke-secret') => {
  const require = createRequire(import.meta.url);
  const { PDFDocument } = require('@cantoo/pdf-lib');
  const bytes = await readFile(file);

  const probe = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const encrypted = probe.isEncrypted;

  let opensWithPassword = false;
  try {
    await PDFDocument.load(bytes, { password });
    opensWithPassword = true;
  } catch (error) {
    opensWithPassword = false;
    return {
      encrypted,
      opensWithPassword,
      detail: `password rejected: ${error.message}`,
    };
  }

  return {
    encrypted,
    opensWithPassword,
    detail: `isEncrypted=${encrypted}, password accepted`,
  };
};

/**
 * Verifies a PDF signature in Node, using node-forge directly.
 *
 * Deliberately independent of the app's own verify.ts: asking the code under
 * test whether its own output is valid proves very little. This re-implements
 * the check from the raw bytes — pull /ByteRange, reassemble the signed spans,
 * and ask forge whether the PKCS#7 blob covers them.
 */
const verifySignedPdf = async (file) => {
  const require = createRequire(import.meta.url);
  const forge = require('node-forge');
  const bytes = await readFile(file);
  const raw = bytes.toString('latin1');

  const match = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/.exec(
    raw
  );
  if (!match) return { ok: false, detail: 'no /ByteRange found' };

  const ranges = [+match[1], +match[2], +match[3], +match[4]];
  const hex = raw
    .slice(ranges[0] + ranges[1], ranges[2])
    .replace(/[<>\s]/g, '')
    .replace(/(00)+$/, '');

  let message;
  try {
    message = forge.pkcs7.messageFromAsn1(
      forge.asn1.fromDer(forge.util.createBuffer(forge.util.hexToBytes(hex)))
    );
  } catch (error) {
    return { ok: false, detail: `PKCS#7 parse failed: ${error.message}` };
  }

  const signed = Buffer.concat([
    bytes.subarray(ranges[0], ranges[0] + ranges[1]),
    bytes.subarray(ranges[2], ranges[2] + ranges[3]),
  ]);

  // node-forge's pkcs7 verify() throws "not yet implemented", so the check is
  // done by hand. Two things must both hold, and only checking the second
  // would let content be swapped while the signature still "verified":
  //   1. the messageDigest attribute equals the digest of the signed spans
  //   2. the RSA signature over the authenticated attributes is valid
  const capture = message.rawCapture;
  const cert = message.certificates?.[0];

  const contentDigest = forge.md.sha256
    .create()
    .update(signed.toString('latin1'))
    .digest()
    .getBytes();

  let attributeDigest = null;
  for (const attribute of capture.authenticatedAttributes ?? []) {
    if (
      forge.asn1.derToOid(attribute.value[0].value) ===
      forge.pki.oids.messageDigest
    ) {
      attributeDigest = attribute.value[1].value[0].value;
    }
  }
  const digestMatches = attributeDigest === contentDigest;

  // Signed over the attributes re-encoded as a universal SET, not the [0]
  // IMPLICIT tag they carry inside the message.
  const attributeSet = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SET,
    true,
    capture.authenticatedAttributes ?? []
  );
  const attributeHash = forge.md.sha256
    .create()
    .update(forge.asn1.toDer(attributeSet).getBytes())
    .digest()
    .getBytes();

  let signatureValid = false;
  try {
    signatureValid = cert.publicKey.verify(attributeHash, capture.signature);
  } catch (error) {
    return { ok: false, detail: `RSA verify threw: ${error.message}` };
  }

  const verified = digestMatches && signatureValid;

  const signer = cert?.subject?.getField('CN')?.value ?? 'unknown';
  // The signature must reach the end of the file, or content was appended
  // after signing and is not covered by it.
  const coversAll = ranges[2] + ranges[3] >= bytes.length - 2;

  return {
    ok: verified && coversAll,
    verified,
    coversAll,
    signer,
    detail:
      `digestMatches=${digestMatches}, rsaValid=${signatureValid}, ` +
      `coversWholeFile=${coversAll}, signer=${signer}`,
  };
};

await mkdir(shots, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ acceptDownloads: true });

/**
 * Headless Chromium exposes `showSaveFilePicker` but can never show the picker,
 * so the promise hangs and the export appears to do nothing. Removing it makes
 * the run take the anchor-download fallback — which is also the path every
 * Firefox and Safari user gets, so it is the more widely exercised branch.
 */
await context.addInitScript(() => {
  delete window.showSaveFilePicker;
});

const page = await context.newPage();

const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) =>
  consoleErrors.push(`pageerror: ${error.message}`)
);

try {
  /* 1. The route renders, and its SEO content is in the *initial* HTML. */
  const response = await fetch(`${BASE}/pdf`);
  const html = await response.text();
  check(
    'GET /pdf is 200',
    response.status === 200,
    `status ${response.status}`
  );
  check(
    'H1 is server-rendered',
    html.includes('A PDF editor that never uploads your file')
  );
  check(
    'JSON-LD is server-rendered',
    html.includes('application/ld+json') && html.includes('WebApplication')
  );
  check('FAQ copy is server-rendered', html.includes('Is my file uploaded'));

  await page.goto(`${BASE}/pdf`, { waitUntil: 'networkidle' });

  /* 2. The editor mounts and shows the drop target. */
  await page.waitForSelector('text=Drop a PDF here', { timeout: 20_000 });
  check('editor mounts client-side', true);
  await page.screenshot({ path: path.join(shots, '01-empty.png') });

  /* 3. Opening a file renders a real page. This is the pdf.js worker test:
        a broken worker path leaves the canvas blank with no exception. */
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'smoke-file-input';
    document.body.append(input);
  });
  const input = await page.$('#smoke-file-input');
  await input.setInputFiles(path.join(samples, 'text-3page.pdf'));
  await page.evaluate(() => {
    const input = document.querySelector('#smoke-file-input');
    const transfer = new DataTransfer();
    for (const file of input.files) transfer.items.add(file);
    window.dispatchEvent(
      Object.assign(new Event('drop', { bubbles: true }), {
        dataTransfer: transfer,
      })
    );
  });

  await page.waitForSelector('canvas', { timeout: 30_000 });
  await page.waitForTimeout(2500);

  const ink = await canvasHasInk(page);
  check('page canvas actually rendered', ink.ok, ink.reason);
  await page.screenshot({ path: path.join(shots, '02-loaded.png') });

  /* 4. Page count and thumbnails. */
  const pageCount = await page.evaluate(
    () => document.querySelectorAll('[data-page-id]').length
  );
  check('3 pages present', pageCount === 3, `found ${pageCount}`);

  const indicator = await page.textContent('[aria-live="polite"]');
  check(
    'page indicator reads 3 pages',
    (indicator ?? '').includes('of 3'),
    indicator ?? ''
  );

  /* 5. The text layer carries real text, which is what makes the viewer
        accessible and searchable rather than a picture of a document. */
  const layerText = await page.evaluate(() => {
    const layer = document.querySelector('.textLayer');
    return layer ? layer.textContent : '';
  });
  check(
    'text layer contains document text',
    (layerText ?? '').includes('MESSYUI-SMOKE-MARKER'),
    (layerText ?? '').slice(0, 60)
  );

  /* 6. Zoom controls change the rendered size. */
  const before = await page.evaluate(
    () => document.querySelector('canvas').style.width
  );
  await page.click('[aria-label="Zoom in"]');
  await page.waitForTimeout(1200);
  const after = await page.evaluate(
    () => document.querySelector('canvas').style.width
  );
  check('zoom changes page size', before !== after, `${before} -> ${after}`);

  /* 6b. Page operations mutate the working document, and undo reverses them. */
  await page.click('[aria-label="Page 2"]');
  await page.waitForTimeout(400);
  await page.click('[aria-label="Delete page"]');
  await page.waitForTimeout(600);
  const afterDelete = await page.evaluate(
    () => document.querySelectorAll('[data-page-id]').length
  );
  check('delete page removes it', afterDelete === 2, `${afterDelete} pages`);

  await page.keyboard.press('Control+z');
  await page.waitForTimeout(600);
  const afterUndo = await page.evaluate(
    () => document.querySelectorAll('[data-page-id]').length
  );
  check('undo restores the page', afterUndo === 3, `${afterUndo} pages`);

  /* 6b-2. Annotation: pick a tool, drag out an object, confirm it exists.
     Scroll back to the top first — clicking a thumbnail above moved the view,
     and a drag aimed at a page that is off-screen lands nowhere. */
  await page.evaluate(() => {
    document.querySelector('[aria-label="Document pages"]')?.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);

  await page.click('[aria-label="Rectangle"]');
  await page.waitForTimeout(300);

  const pageBox = await page.evaluate(() => {
    const element = document.querySelector('[data-page-id]');
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });

  await page.mouse.move(pageBox.x + 100, pageBox.y + 120);
  await page.mouse.down();
  await page.mouse.move(pageBox.x + 260, pageBox.y + 220, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(600);

  const objectCount = await page.evaluate(
    () => document.querySelectorAll('[role="listitem"]').length
  );
  check(
    'drawing creates an object',
    objectCount >= 1,
    `${objectCount} objects`
  );
  await page.screenshot({ path: path.join(shots, '05-annotated.png') });

  // Drawing returns to the select tool and selects the new object, so the
  // resize handles should be present without any further clicking.
  const handles = await page.evaluate(
    () => document.querySelectorAll('[aria-label^="Resize"]').length
  );
  check(
    'new object is selected with handles',
    handles === 8,
    `${handles} handles`
  );

  /* 6b-3. Signing: draw on the pad, place it, and stamp a date. This is the
     flagship flow, so it is checked end to end rather than by unit. */
  await page.click('[aria-label="Add signature"]');
  await page.waitForSelector('text=Add a signature', { timeout: 10_000 });

  const pad = await page.evaluate(() => {
    const rect = document
      .querySelector('[aria-label="Signature drawing area"]')
      .getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });

  // A short scribble, so the trimmed PNG has real ink in it.
  await page.mouse.move(pad.x + 40, pad.y + pad.height * 0.6);
  await page.mouse.down();
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(
      pad.x + 40 + step * 14,
      pad.y + pad.height * (0.6 - Math.sin(step / 2) * 0.18)
    );
  }
  await page.mouse.up();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(shots, '06-signature-pad.png') });

  await page.click('button:has-text("Place signature")');
  await page.waitForTimeout(900);

  const signatureCount = await page.evaluate(
    () =>
      document.querySelectorAll('[role="listitem"][aria-label="Signature"]')
        .length
  );
  check(
    'signature is placed on the page',
    signatureCount === 1,
    `${signatureCount} signatures`
  );

  await page.click('[aria-label="Add today\'s date"]');
  await page.waitForTimeout(500);
  const dateText = await page.evaluate(() => {
    const items = [...document.querySelectorAll('[role="listitem"]')];
    return items.map((item) => item.getAttribute('aria-label')).join(' | ');
  });
  check(
    'date stamp is placed',
    /Text: \d/.test(dateText),
    dateText.slice(0, 80)
  );
  await page.screenshot({ path: path.join(shots, '07-signed.png') });

  /* 6c. Export round-trip: the saved file must reopen with the same pages. */
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.click('button:has-text("Download")');
  const download = await downloadPromise;
  const exported = path.join(samples, 'exported.pdf');
  await download.saveAs(exported);
  const { size } = await stat(exported);
  check('export produces a file', size > 500, `${size} bytes`);

  const exportedBytes = await readFile(exported);
  const header = exportedBytes.subarray(0, 5).toString('latin1');
  check('exported file is a PDF', header === '%PDF-', header);

  // Decompress page 1 and look for the actual drawing operators. Checking the
  // raw bytes for "/Subtype /Image" would only prove an image was *embedded*;
  // this proves it was also *drawn*, which is the claim that matters — an
  // annotation that exists only on screen is not an edit.
  const drawn = await inspectFirstPage(exported);
  check(
    'signature is drawn into the exported page',
    drawn.hasImageDraw,
    drawn.imageOps || 'no Do operator'
  );
  check(
    'date text is written into the exported page',
    drawn.text.includes('August') || /\d{4}/.test(drawn.text),
    drawn.text || 'no text found'
  );

  /* 6d. The sub-routes are real, indexable pages. */
  const mergeResponse = await fetch(`${BASE}/pdf/merge`);
  const mergeHtml = await mergeResponse.text();
  check(
    '/pdf/merge is server-rendered',
    mergeResponse.status === 200 && mergeHtml.includes('Merge PDFs'),
    `status ${mergeResponse.status}`
  );
  check(
    '/pdf/merge has its own canonical',
    mergeHtml.includes('/pdf/merge"') || mergeHtml.includes('/pdf/merge<'),
    'canonical link present'
  );

  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  check(
    'sitemap lists the PDF tools',
    sitemap.includes('/pdf</loc>') || sitemap.includes('/pdf<'),
    ''
  );
  check('sitemap lists /pdf/merge', sitemap.includes('/pdf/merge'));

  const llms = await (await fetch(`${BASE}/llms.txt`)).text();
  check('llms.txt lists the PDF editor', llms.includes('PDF Editor'));

  /* 6e. Security round-trip: set a password on export, then prove the saved
     file genuinely requires it. Asserting the *absence* of access is the only
     way to show encryption did something. */
  await page.click('[aria-label="Password and permissions"]');
  await page.waitForSelector('text=Password and permissions', {
    timeout: 10_000,
  });
  await page.click('#encrypt-enabled');
  await page.waitForTimeout(300);
  await page.fill('#user-password', 'smoke-secret');
  // Scope to the button: a bare `text=Apply` substring-matches the dialog's
  // own description ("Applied when you download"), which clicks nothing and
  // leaves the overlay blocking everything behind it.
  await page.click('button:has-text("Apply")');
  await page.waitForSelector('[data-slot="dialog-overlay"]', {
    state: 'detached',
    timeout: 10_000,
  });

  const protectedDownload = page.waitForEvent('download', { timeout: 30_000 });
  await page.click('button:has-text("Download")');
  const protectedFile = path.join(samples, 'exported-protected.pdf');
  await (await protectedDownload).saveAs(protectedFile);

  const locked = await isEncrypted(protectedFile);
  check('exported file is encrypted', locked.encrypted, locked.detail);
  check(
    'the chosen password opens it',
    locked.opensWithPassword,
    locked.detail
  );

  /* 6f. Cryptographic signing, then verified in Node rather than in the
     browser that produced it. This is the riskiest path in the whole feature —
     the Buffer shim, the CJS interop, and the byte-range splice all have to be
     right or the signature is silently worthless. */
  await page.click('[aria-label="Sign with a certificate"]');
  await page.waitForSelector('#cert-passphrase', { timeout: 10_000 });

  const chooser = page.waitForEvent('filechooser');
  await page.click('button:has-text("Choose a certificate file")');
  await (await chooser).setFiles(path.join(samples, 'test-cert.p12'));
  await page.waitForTimeout(400);

  await page.fill('#cert-passphrase', 'test');
  // Blur triggers the certificate preview, which is also a parse check.
  await page.click('#sign-reason');
  await page.waitForTimeout(2500);

  const certPreview = await page.evaluate(
    () => document.body.innerText.match(/Messy UI Smoke Test/)?.[0] ?? ''
  );
  check(
    'certificate is read and previewed',
    certPreview === 'Messy UI Smoke Test',
    certPreview || 'no preview shown'
  );
  await page.screenshot({ path: path.join(shots, '08-certificate.png') });

  const signedDownload = page.waitForEvent('download', { timeout: 60_000 });
  await page.click('button:has-text("Sign and download")');
  const signedFile = path.join(samples, 'exported-signed.pdf');
  await (await signedDownload).saveAs(signedFile);

  const signature = await verifySignedPdf(signedFile);
  check('signature verifies in Node', signature.ok, signature.detail);
  check(
    'signature covers the whole file',
    signature.coversAll === true,
    signature.detail
  );

  // Negative control. A verifier that returns true unconditionally would pass
  // every check above, so flip one byte inside the signed range and confirm
  // the result actually changes.
  const tamperedFile = path.join(samples, 'exported-tampered.pdf');
  const original = await readFile(signedFile);
  const tampered = Buffer.from(original);
  // Byte 200 is inside the first signed span for any real PDF.
  tampered[200] = tampered[200] ^ 0xff;
  await writeFile(tamperedFile, tampered);

  const tamperedResult = await verifySignedPdf(tamperedFile);
  check(
    'a tampered file fails verification',
    tamperedResult.ok === false,
    tamperedResult.detail
  );

  /* 7. Encrypted files prompt rather than failing silently. */
  await page.goto(`${BASE}/pdf`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Drop a PDF here');
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'smoke-file-input';
    document.body.append(input);
  });
  const encInput = await page.$('#smoke-file-input');
  await encInput.setInputFiles(path.join(samples, 'encrypted-user.pdf'));
  await page.evaluate(() => {
    const input = document.querySelector('#smoke-file-input');
    const transfer = new DataTransfer();
    for (const file of input.files) transfer.items.add(file);
    window.dispatchEvent(
      Object.assign(new Event('drop', { bubbles: true }), {
        dataTransfer: transfer,
      })
    );
  });

  await page.waitForSelector('text=Password required', { timeout: 20_000 });
  check('encrypted PDF prompts for a password', true);
  await page.screenshot({ path: path.join(shots, '03-password.png') });

  await page.fill('#pdf-password', 'test');
  await page.click('button[type="submit"]');
  await page.waitForSelector('canvas', { timeout: 30_000 });
  await page.waitForTimeout(2000);
  const encInk = await canvasHasInk(page);
  check('encrypted PDF renders after unlock', encInk.ok, encInk.reason);
  await page.screenshot({ path: path.join(shots, '04-decrypted.png') });

  /* 8. Nothing threw along the way. */
  const realErrors = consoleErrors.filter(
    (message) => !message.includes('favicon') && !message.includes('404')
  );
  check(
    'no console or page errors',
    realErrors.length === 0,
    realErrors.slice(0, 3).join(' | ')
  );
} catch (error) {
  check('smoke run completed', false, error.message);
  await page
    .screenshot({ path: path.join(shots, 'failure.png') })
    .catch(() => {});
} finally {
  await browser.close();
}

console.log(
  `\n${results.length - failures}/${results.length} checks passed. Screenshots in ${shots}`
);
process.exit(failures > 0 ? 1 : 0);
