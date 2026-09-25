import { expect, test } from '@playwright/test';

const clock = (page: import('@playwright/test').Page) =>
  page.getByText(/^\d{1,2}:\d{2}(:\d{2})?$/).first();

test.describe('countdown timer', () => {
  test('a curated preset loads its own duration', async ({ page }) => {
    await page.goto('/timer/25-minute-timer');
    await expect(clock(page)).toHaveText('25:00');
  });

  test('an hour preset formats with hours', async ({ page }) => {
    await page.goto('/timer/1-hour-timer');
    await expect(clock(page)).toHaveText('1:00:00');
  });

  test('a derived slug still opens a working timer', async ({ page }) => {
    await page.goto('/timer/17-minute-timer');
    await expect(clock(page)).toHaveText('17:00');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/
    );
  });

  test('starting counts down and pausing holds', async ({ page }) => {
    await page.goto('/timer/25-minute-timer');

    await page.getByRole('button', { name: /start/i }).first().click();
    await expect(clock(page)).not.toHaveText('25:00', { timeout: 3000 });

    await page.getByRole('button', { name: /pause/i }).first().click();
    const held = await clock(page).textContent();
    await page.waitForTimeout(1500);
    await expect(clock(page)).toHaveText(held!);
  });

  test('reset returns to the starting duration', async ({ page }) => {
    await page.goto('/timer/25-minute-timer');

    await page.getByRole('button', { name: /start/i }).first().click();
    await expect(clock(page)).not.toHaveText('25:00', { timeout: 3000 });

    await page.getByRole('button', { name: /reset/i }).first().click();
    await expect(clock(page)).toHaveText('25:00');
  });

  test('space starts and pauses, r resets', async ({ page }) => {
    await page.goto('/timer/25-minute-timer');
    await page.locator('body').click();

    await page.keyboard.press('Space');
    await expect(clock(page)).not.toHaveText('25:00', { timeout: 3000 });

    await page.keyboard.press('r');
    await expect(clock(page)).toHaveText('25:00');
  });

  test('the remaining time appears in the tab title', async ({ page }) => {
    await page.goto('/timer/25-minute-timer');
    const baseTitle = await page.title();

    await page.getByRole('button', { name: /start/i }).first().click();
    await expect
      .poll(() => page.title(), { timeout: 5000 })
      .not.toBe(baseTitle);
    expect(await page.title()).toMatch(/\d{1,2}:\d{2}/);
  });

  test('the timer landing page links to the popular presets', async ({
    page,
  }) => {
    await page.goto('/timer');

    await expect(
      page.getByRole('link', { name: /pomodoro/i }).first()
    ).toBeVisible();
    expect(await page.locator('a[href^="/timer/"]').count()).toBeGreaterThan(5);
  });

  test('a valid custom duration is applied', async ({ page }) => {
    await page.goto('/timer/25-minute-timer');

    const custom = page.getByPlaceholder('Custom');
    await custom.fill('7');
    await custom.press('Enter');

    await expect(clock(page)).toHaveText('07:00');
  });

  test('the custom field accepts the maximum duration', async ({ page }) => {
    await page.goto('/timer/25-minute-timer');

    const custom = page.getByPlaceholder('Custom');
    await custom.fill('600');
    await custom.press('Enter');

    await expect(clock(page)).toHaveText('10:00:00');
  });

  test('an out-of-range custom duration is refused, not clamped silently', async ({
    page,
  }) => {
    // The field carries min/max, so the browser blocks the submit itself and
    // the countdown keeps its previous duration. The clamp inside the submit
    // handler is a backstop for when validation is bypassed.
    await page.goto('/timer/25-minute-timer');
    const custom = page.getByPlaceholder('Custom');

    for (const [value, flag] of [
      ['9999', 'rangeOverflow'],
      ['0', 'rangeUnderflow'],
    ] as const) {
      await custom.fill(value);
      expect(
        await custom.evaluate(
          (el, key) => (el as HTMLInputElement).validity[key],
          flag
        ),
        `${value} should be ${flag}`
      ).toBe(true);

      await custom.press('Enter');
      await expect(clock(page)).toHaveText('25:00');
    }
  });
});
