import { defineConfig, devices } from '@playwright/test';

// E2E_PORT lets several worktrees run e2e side by side without reusing each other's server.
const port = Number(process.env.E2E_PORT ?? 5174);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: 'test/e2e',
  globalSetup: './test/e2e/global-setup.ts',
  fullyParallel: true,
  // Perf measurements (spec §14) run only on demand: pnpm test:e2e --grep @perf.
  grepInvert: process.argv.some((a) => a.includes('@perf'))
    ? undefined
    : /@perf/,
  retries: process.env.CI ? 1 : 0,
  // CI uploads playwright-report on failure, so it needs the html reporter.
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /signing\.spec\.ts/,
    },
    // Signing+ (plan H-15): a fake camera that needs no permission prompt.
    {
      name: 'chromium-camera',
      testMatch: /signing\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['camera'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
          ],
        },
      },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
