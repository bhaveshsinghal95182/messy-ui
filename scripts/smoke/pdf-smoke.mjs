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
import { mkdir, readFile, stat } from 'node:fs/promises';
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

  /* 6c. Export round-trip: the saved file must reopen with the same pages. */
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.click('text=Download');
  const download = await downloadPromise;
  const exported = path.join(samples, 'exported.pdf');
  await download.saveAs(exported);
  const { size } = await stat(exported);
  check('export produces a file', size > 500, `${size} bytes`);

  const header = (await readFile(exported)).subarray(0, 5).toString('latin1');
  check('exported file is a PDF', header === '%PDF-', header);

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
