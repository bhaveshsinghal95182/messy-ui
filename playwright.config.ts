import { defineConfig, devices } from '@playwright/test';

/**
 * E2E runs in two modes:
 *
 * - Against a Vercel preview deployment, when BASE_URL is set. That is the
 *   lane CI uses on pull requests, so the tests exercise the real build,
 *   including redirects and metadata routes.
 * - Against a locally built server otherwise, which is what you get running
 *   `pnpm test:e2e` on your machine and on pushes to master.
 */
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const isExternal = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Capped rather than left to default (half the cores). These specs drive
  // animation-heavy pages through one `next start`, and past about four
  // browsers the server starves: tests then fail on actionability and
  // teardown timeouts that say nothing about the site.
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // "retain-on-failure" still records every test and throws the passes away.
    // That encoding cost is worth paying in CI, where the video is the only
    // way to see what happened; locally it just starves the run.
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Only start a server when we are not pointed at a deployment.
  webServer: isExternal
    ? undefined
    : {
        command: 'pnpm build && pnpm start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
