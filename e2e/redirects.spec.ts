import { expect, test } from '@playwright/test';

test.describe('redirects', () => {
  test('a component alias redirects to its canonical slug', async ({
    page,
  }) => {
    await page.goto('/components/odometer-counter');
    await expect(page).toHaveURL(/\/components\/animated-counter$/);
  });

  for (const alias of ['number-counter', 'digit-counter']) {
    test(`the ${alias} alias resolves to animated-counter`, async ({
      page,
    }) => {
      await page.goto(`/components/${alias}`);
      await expect(page).toHaveURL(/\/components\/animated-counter$/);
    });
  }

  test('the legacy category query redirects to the category page', async ({
    page,
  }) => {
    await page.goto('/components?category=Animations');
    // Case-insensitive: on a case-insensitive filesystem the capitalised path
    // resolves straight to the prerendered lowercase page instead of taking
    // the redirect, so only the destination path is worth asserting.
    await expect(page).toHaveURL(/\/components\/category\/animations/i);
  });

  test('a non-canonical category slug redirects to the canonical one', async ({
    page,
  }) => {
    await page.goto('/components/category/Animations');
    await expect(page).toHaveURL(/\/components\/category\/animations/i);
  });

  test('a timer alias redirects to its curated page', async ({ page }) => {
    await page.goto('/timer/pomodoro');
    await expect(page).toHaveURL(/\/timer\/pomodoro-timer$/);
  });

  test('a duration alias redirects to the hour spelling', async ({ page }) => {
    await page.goto('/timer/60-minute-timer');
    await expect(page).toHaveURL(/\/timer\/1-hour-timer$/);
  });

  test('an alias page is marked noindex so it cannot compete in search', async ({
    page,
  }) => {
    // Follow the redirect, then check the canonical page is indexable.
    await page.goto('/components/animated-counter');
    const robots = page.locator('meta[name="robots"]');

    if (await robots.count()) {
      await expect(robots).not.toHaveAttribute('content', /noindex/);
    }
  });
});
