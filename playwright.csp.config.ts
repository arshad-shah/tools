import { defineConfig, devices } from '@playwright/test';

/*
 * Content-Security-Policy check (plan F-2) against the production build on
 * `vite preview`, which serves the same headers as the deployed _headers
 * file. Run with `pnpm test:csp` (builds first).
 */
const port = Number(process.env.CSP_PORT ?? 4174);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: 'test/e2e-csp',
  globalSetup: './test/e2e-csp/global-setup.ts',
  fullyParallel: true,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm exec vite preview --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
