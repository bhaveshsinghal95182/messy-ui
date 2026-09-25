import { expect, test } from '@playwright/test';

/**
 * The whole reason progress-bar uses `sandbox: 'iframe'` is that it needs its
 * own scroll context - inline, it would track the docs page instead of the
 * demo. That is exactly what jsdom cannot check, so it is pinned here.
 */
test.describe('iframe-sandboxed preview', () => {
  test('the preview loads inside its own frame', async ({ page }) => {
    await page.goto('/components/progress-bar');

    const frame = page.frameLocator('iframe[title*="preview"]');
    await expect(frame.locator('body')).toBeVisible();
  });

  test('scrolling inside the frame advances the bar, not the parent page', async ({
    page,
  }) => {
    await page.goto('/components/progress-bar');

    const iframe = page.locator('iframe[title*="preview"]');
    await iframe.scrollIntoViewIfNeeded();

    const frame = page.frameLocator('iframe[title*="preview"]');
    // The bar starts at scaleX(0), which counts as hidden, so assert it is
    // attached and read its transform rather than its visibility.
    const bar = frame.locator('.fixed').first();
    await expect(bar).toBeAttached();

    const parentScrollBefore = await page.evaluate(() => window.scrollY);
    const scaleBefore = await bar.evaluate(
      (el) => getComputedStyle(el).transform
    );

    // Scroll the document *inside* the frame.
    await frame.locator('body').evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(500);

    const scaleAfter = await bar.evaluate(
      (el) => getComputedStyle(el).transform
    );
    const parentScrollAfter = await page.evaluate(() => window.scrollY);

    expect(scaleAfter).not.toBe(scaleBefore);
    expect(parentScrollAfter).toBe(parentScrollBefore);
  });

  test('the preview route is excluded from search engines', async ({
    page,
    request,
  }) => {
    await page.goto('/preview/progress-bar');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/
    );

    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /preview/');
  });

  test('props survive the trip through the query string', async ({ page }) => {
    await page.goto('/preview/progress-bar?position=%22bottom%22&height=6');

    const bar = page.locator('.fixed').first();
    await expect(bar).toHaveClass(/bottom-0/);
    await expect(bar).toHaveCSS('height', '24px');
  });

  test('a hand-typed unquoted value still works', async ({ page }) => {
    // Not valid JSON, so the decoder falls back to a plain string.
    await page.goto('/preview/progress-bar?position=bottom');
    await expect(page.locator('.fixed').first()).toHaveClass(/bottom-0/);
  });
});
