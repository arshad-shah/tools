import { execSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';
const FIXTURE = 'test/fixtures/generated/text-3.pdf';
const TOOL_ROUTES = ['/', '/pdf-merger', '/pdf-splitter', '/pdf-organize'];

/**
 * Vite compiles modules and optimises dependencies on first request. When
 * several workers hit a cold dev server at once, a late dependency discovery
 * triggers a full reload mid-test and the first pdf.js render blows its
 * assertion timeout. Visit every tool and load a document once (which boots
 * the pdf.js worker) so the specs run against a warm server.
 */
async function warmUp() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ baseURL: BASE_URL });
    for (const route of TOOL_ROUTES) {
      await page.goto(route, { waitUntil: 'networkidle' });
      const input = page.locator('input[type=file]');
      if ((await input.count()) > 0) {
        await input.first().setInputFiles(FIXTURE);
        await page.waitForLoadState('networkidle');
        await page
          .getByRole('img')
          .first()
          .waitFor({ state: 'visible', timeout: 60_000 })
          .catch(() => undefined);
        await page.waitForLoadState('networkidle');
      }
    }
  } finally {
    await browser.close();
  }
}

export default async function globalSetup() {
  execSync('pnpm fixtures', { stdio: 'inherit' });
  await warmUp();
}
