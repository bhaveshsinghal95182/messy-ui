import { expect, test } from '@playwright/test';

test('the header lists every available standalone tool', async ({ page }) => {
  await page.goto('/components');

  await page.getByRole('button', { name: 'Browse tools' }).click();

  const timerLink = page.getByRole('menuitem', { name: /Countdown Timer/ });
  await expect(timerLink).toBeVisible();
  await expect(timerLink).toHaveAttribute('href', '/timer');

  await timerLink.click();
  await expect(page).toHaveURL(/\/timer$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'LeetCode Timer'
  );
});
