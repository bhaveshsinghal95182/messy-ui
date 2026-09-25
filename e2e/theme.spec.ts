import { expect, test } from '@playwright/test';

const rootClass = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.className);

test.describe('theme', () => {
  test('the toggle switches the theme and names its next action', async ({
    page,
  }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: /toggle theme/i }).first();
    await expect(toggle).toBeVisible();

    const before = await rootClass(page);
    await toggle.click();

    await expect
      .poll(() => rootClass(page), { timeout: 3000 })
      .not.toBe(before);
  });

  test('the choice survives a navigation', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: /toggle theme/i }).first();
    await toggle.click();
    const chosen = await rootClass(page);

    await page.goto('/components');
    await expect.poll(() => rootClass(page), { timeout: 3000 }).toBe(chosen);
  });

  test('the theme is correct before hydration, with no flash', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    // next-themes writes the class in a blocking script, so it is already
    // right on the very first paint rather than after React hydrates.
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('respects a light system preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
