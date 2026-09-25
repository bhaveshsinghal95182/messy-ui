import { expect, test } from '@playwright/test';

/**
 * Data-driven from the sitemap, so a new component or timer preset is covered
 * the moment it ships without anyone remembering to add a case here.
 */
test.describe('site smoke', () => {
  test('every page in the sitemap renders', async ({ page, request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.ok()).toBeTruthy();

    const urls = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((match) => new URL(match[1]).pathname)
      // Timer presets are many and near-identical; a sample keeps this quick.
      .filter((path, i) => !path.startsWith('/timer/') || i % 7 === 0);

    expect(urls.length).toBeGreaterThan(5);

    // One test, one navigation per sitemap entry. The default per-test budget
    // covers a handful of those, not a whole site, so scale it with the work:
    // otherwise adding components slowly turns this into a flake.
    test.setTimeout(15_000 + urls.length * 5_000);

    for (const path of urls) {
      const res = await page.goto(path);

      // A sitemap URL is canonical, so it must answer directly rather than
      // redirect. The one exception is a local quirk, not a site one: on a
      // case-insensitive filesystem the prerendered `/category/Animations`
      // and `/category/animations` share a file, so whichever spelling the
      // redirects spec touched first answers for both and the canonical URL
      // replays that redirect. It cannot happen on the Linux runner where CI
      // gates, so skip just that case rather than weakening the assertion.
      if (
        process.platform === 'win32' &&
        path.includes('/category/') &&
        res?.status() !== 200
      ) {
        continue;
      }

      expect(res?.status(), `${path} did not return 200`).toBe(200);

      await expect(
        page.locator('h1').first(),
        `${path} has no visible h1`
      ).toBeVisible();
    }
  });

  test('the gallery lists components and links into them', async ({ page }) => {
    await page.goto('/components');

    const links = page.locator('a[href^="/components/"]');
    await expect(links.first()).toBeVisible();
    expect(await links.count()).toBeGreaterThan(5);
  });

  test('an unknown component returns 404', async ({ page }) => {
    const response = await page.goto('/components/definitely-not-a-component');
    expect(response?.status()).toBe(404);
  });

  test('an unrecognised slug degrades instead of erroring', async ({
    page,
  }) => {
    // Percent-encoded junk (%25, %zz) is rejected by Next's own param decoder
    // before any app code runs, so it is not covered here - the guards for
    // what does reach us are unit-tested in tests/unit/timers.test.ts.
    const cases: [string, number][] = [
      // An unknown timer still opens a working default countdown.
      ['/timer/not-a-real-timer', 200],
      // An unknown category is a genuine 404, not a soft one.
      ['/components/category/not-a-real-category', 404],
      ['/components/not-a-real-component', 404],
    ];

    test.setTimeout(15_000 + cases.length * 15_000);

    for (const [path, expected] of cases) {
      const response = await page.goto(path);
      expect(response?.status(), `${path}`).toBe(expected);
    }
  });

  test('the homepage throws nothing and loads every asset', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
      // @vercel/analytics only serves its script on Vercel, so a local build
      // always 404s for it. That is deployment noise, not a page fault.
      if (response.url().includes('/_vercel/insights/')) return;
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/');
    // Not networkidle: the 3D hero keeps requests in flight, so the page
    // never reaches idle and the wait just times out.
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);

    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
});
