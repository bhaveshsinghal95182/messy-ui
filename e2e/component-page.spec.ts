import { expect, test } from '@playwright/test';

test.describe('component page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components/hold-button');
  });

  test('renders the live preview', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /hold to delete/i })
    ).toBeVisible();
  });

  test('switches between the preview and the usage code', async ({ page }) => {
    await page.getByRole('tab', { name: 'Code' }).click();
    await expect(page.getByText('import HoldButton')).toBeVisible();

    await page.getByRole('tab', { name: 'Preview' }).click();
    await expect(
      page.getByRole('button', { name: /hold to delete/i })
    ).toBeVisible();
  });

  test('resizes the preview frame per device', async ({ page }) => {
    const frame = page.locator('[style*="width"]').first();

    await page.getByRole('button', { name: 'mobile preview' }).click();
    await expect(
      page.getByRole('button', { name: 'mobile preview' })
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(frame).toBeVisible();
  });

  test('the props playground drives the live preview', async ({ page }) => {
    await page.getByRole('button', { name: /playground/i }).click();
    await expect(page.getByText('Props Playground')).toBeVisible();

    const labelInput = page.locator('#label');
    await expect(labelInput).toHaveValue('Hold to Delete');
    await labelInput.fill('Hold to Archive');

    await expect(
      page.getByRole('button', { name: /hold to archive/i })
    ).toBeVisible();
  });

  test('the playground copies generated usage code', async ({ page }) => {
    // browserName is 'chromium' for Mobile Chrome too, so it cannot gate this.
    // Clipboard permissions are granted on the desktop project only.
    test.skip(
      test.info().project.name !== 'chromium',
      'clipboard permissions are granted on the desktop chromium project only'
    );

    await page.getByRole('button', { name: /playground/i }).click();
    await page.locator('#label').fill('Hold to Archive');
    await page.getByRole('button', { name: /copy code/i }).click();

    // The write is async, so reading straight after the click races it. The
    // button flipping to its copied state is the page saying it has landed.
    await expect(page.getByRole('button', { name: /copied/i })).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('label="Hold to Archive"');
  });

  test('shows the shadcn install command for each runner', async ({ page }) => {
    const install = page.getByText('npx shadcn@latest add', { exact: false });
    await expect(install.first()).toBeVisible();

    // The runner tabs sit well below the fold, and this page reflows as it
    // scrolls. Land the scroll first, or the click chases a moving target and
    // silently misses - which on the narrow viewport it reliably does.
    const pnpmTab = page.getByRole('tab', { name: 'pnpm' }).first();
    await pnpmTab.scrollIntoViewIfNeeded();
    await expect(pnpmTab).toBeInViewport();

    await pnpmTab.click();
    // The panel swaps on a transition, so assert the tab took first - looking
    // for the command before then just races the animation.
    await expect(pnpmTab).toHaveAttribute('aria-selected', 'true');

    await expect(
      page.getByText('pnpm dlx shadcn@latest add', { exact: false }).first()
    ).toBeVisible();
  });

  test('copies the install command to the clipboard', async ({ page }) => {
    test.skip(
      test.info().project.name !== 'chromium',
      'clipboard permissions are granted on the desktop chromium project only'
    );

    await page
      .getByRole('button', { name: /copy command/i })
      .first()
      .click();

    await expect(
      page.getByRole('button', { name: /command copied/i }).first()
    ).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('shadcn@latest add');
    expect(clipboard).toContain('/r/hold-button.json');
  });

  test('the advertised registry JSON actually resolves', async ({
    request,
  }) => {
    // The install command is only as good as the file it points at.
    const response = await request.get('/r/hold-button.json');
    expect(response.ok()).toBeTruthy();

    const json = await response.json();
    expect(json.name).toBe('hold-button');
    expect(json.files.length).toBeGreaterThan(0);
    for (const file of json.files) {
      expect(file.content?.length ?? 0).toBeGreaterThan(0);
    }
  });

  test('documents the props', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'holdDuration', exact: true })
    ).toBeVisible();
  });

  test('the hold interaction works end to end', async ({ page }) => {
    const button = page.getByRole('button', { name: /hold to delete/i });
    await button.scrollIntoViewIfNeeded();

    // The page's entrance animation shifts the preview for about a second
    // after load, and a press that starts mid-shift is cancelled by the
    // mouseleave that produces. Wait for the button to stop moving first -
    // the animation is not what this test is about.
    let previous = -1;
    await expect
      .poll(
        async () => {
          const box = await button.boundingBox();
          const settled = box !== null && box.y === previous;
          previous = box?.y ?? -1;
          return settled;
        },
        { timeout: 10_000, intervals: [250] }
      )
      .toBe(true);

    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(2000);
    await page.mouse.up();

    await expect(page.getByRole('button', { name: /deleted/i })).toBeVisible();
  });
});
