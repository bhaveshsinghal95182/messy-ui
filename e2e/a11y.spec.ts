import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Unlike the jsdom axe checks, this runs against a fully styled page in a real
 * browser, so colour contrast and landmark structure are meaningful here.
 */
const scan = (page: Page) =>
  new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
  ]);

// color-contrast is a `serious` rule under the WCAG AA tags above, so the
// per-page scans cover the palette - no separate contrast test is needed.
const BLOCKING = ['serious', 'critical'];

const PAGES = ['/', '/components', '/components/hold-button', '/timer'];

/**
 * Brings the page to its resting state before scanning.
 *
 * Scanning mid-animation produces false contrast failures: an element part
 * way through a fade really is low-contrast at that instant, so axe is right
 * and the finding is still meaningless. Two things make that easy to hit
 * here - framer-motion animates via rAF and inline styles, which
 * `document.getAnimations()` cannot see, and the gallery cards use
 * `whileInView`, so anything below the fold never animates in at all until it
 * is scrolled past.
 *
 * So: ask for reduced motion, walk the whole page to trigger every in-view
 * reveal, return to the top, and only then scan.
 */
const settle = async (page: Page) => {
  await page.waitForLoadState('load');

  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });

  // Wait for motion to stop rather than for every element to reach full
  // opacity - some are deliberately transparent (hover overlays), so a
  // "must all be 1" check never resolves.
  //
  // Sample the opacity values themselves, not how many are below 1: that
  // count holds steady all the way through a fade, so a count-based check
  // reports "settled" while everything is still mid-tween. Two identical
  // value fingerprints in a row is the real signal.
  let previous = '';
  for (let attempt = 0; attempt < 30; attempt++) {
    const fingerprint = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[style*="opacity"]')]
        .map((el) => el.style.opacity)
        .join(',')
    );
    if (fingerprint === previous) break;
    previous = fingerprint;
    await page.waitForTimeout(200);
  }

  await page.waitForTimeout(500);
};

const setTheme = async (page: Page, theme: 'light' | 'dark') => {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.reload();
  await settle(page);
};

test.describe('accessibility', () => {
  // A full axe pass over a styled page is slow, and each of these runs one
  // (or several, while motion settles) on top of a reload.
  test.describe.configure({ timeout: 120_000 });

  for (const path of PAGES) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${path} has no serious violations in ${theme} mode`, async ({
        page,
      }) => {
        await page.goto(path);
        await setTheme(page, theme);

        // Retry the scan rather than trusting a single shot. A finding that
        // comes from catching an element mid-fade clears on the next pass; a
        // real one is still there when the budget runs out.
        //
        // Deliberately not expect.poll: when that gives up it reports its own
        // timeout, and the violation list - the only useful part of the
        // failure - never reaches the report.
        let blocking: string[] = [];
        const deadline = Date.now() + 45_000;

        do {
          const { violations } = await scan(page)
            .exclude('[style*="mix-blend-mode"]')
            .analyze();

          const failing = violations.filter((v) =>
            BLOCKING.includes(v.impact ?? '')
          );

          if (failing.length === 0) {
            blocking = [];
            break;
          }

          // Name the offending elements, and read back the opacity actually
          // applied to each: a node still part way through a fade reads below
          // 1, which is the difference between a real palette problem and an
          // animation the scan caught in flight.
          blocking = [];
          for (const violation of failing) {
            for (const node of violation.nodes.slice(0, 5)) {
              const selector = node.target.join(' ');
              const opacity = await page
                .locator(selector)
                .first()
                .evaluate((el) => getComputedStyle(el).opacity)
                .catch(() => '?');

              blocking.push(
                `${violation.id} @ ${selector} [opacity ${opacity}] ${node.any
                  .map((check) => check.message)
                  .join(' | ')}`
              );
            }
          }

          await page.waitForTimeout(1000);
        } while (Date.now() < deadline);

        expect(blocking).toEqual([]);
      });
    }
  }

  test('the gallery is reachable by keyboard alone', async ({ page }) => {
    await page.goto('/components');
    // The tab budget below is finite, so start from a page that has its links:
    // tabbing while the gallery is still arriving spends stops on nothing.
    await page.locator('a[href^="/components/"]').first().waitFor();

    // Tab until a component link takes focus, then activate it.
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const href = await page.evaluate(
        () => document.activeElement?.getAttribute('href') ?? ''
      );
      if (/^\/components\/[a-z-]+$/.test(href)) {
        await page.keyboard.press('Enter');
        await page.waitForURL(`**${href}`);
        return;
      }
    }

    throw new Error('no component link was reachable within 40 tab stops');
  });

  test('focus is always visible on interactive elements', async ({ page }) => {
    await page.goto('/components/hold-button');

    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const style = getComputedStyle(el);
      return {
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
      };
    });

    expect(outline).not.toBeNull();
    const hasIndicator =
      outline!.outlineWidth !== '0px' || outline!.boxShadow !== 'none';
    expect(hasIndicator).toBe(true);
  });

  test('every image has alt text', async ({ page }) => {
    test.setTimeout(15_000 + PAGES.length * 15_000);

    for (const path of PAGES) {
      await page.goto(path);
      const missing = await page
        .locator('img:not([alt])')
        .evaluateAll((els) => els.map((el) => el.getAttribute('src')));
      expect(missing, `${path} has images without alt`).toEqual([]);
    }
  });

  test('the page declares its language', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', /.+/);
  });
});
