import { defineConfig, devices } from '@playwright/test';

/*
 * Visual regression for the dev-only kit gallery (and, from A2, pages).
 * Baselines are per platform (decision G8): local win32 baselines gate PRs;
 * Linux baselines come from the pinned Playwright container
 * (pnpm test:visual:docker).
 */
const port = Number(process.env.E2E_PORT ?? 5175);

export default defineConfig({
  testDir: 'test/visual',
  testMatch: /.*\.visual\.ts$/,
  fullyParallel: true,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  snapshotPathTemplate:
    '{testDir}/__screenshots__/{platform}/{testFilePath}/{arg}{ext}',
  expect: {
    // Screenshots wait for fonts from the dev server; under a full parallel
    // run that can take longer than the 5 s default. A budget, not a retry.
    timeout: 15_000,
    toHaveScreenshot: {
      // Absolute, so a small change inside a large section (two swapped key
      // chips in the icons grid) still fails; anti-aliasing noise stays far
      // below it on a pinned platform.
      maxDiffPixels: 100,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  use: {
    baseURL: `http://localhost:${port}`,
    reducedMotion: 'reduce',
    colorScheme: 'light',
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
