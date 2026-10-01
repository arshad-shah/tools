import { execSync } from 'node:child_process';
import { chromium, type FullConfig } from '@playwright/test';

const FIXTURE = 'test/fixtures/generated/text-3.pdf';
const TOOL_ROUTES = ['/pdf-merger', '/pdf-splitter', '/pdf-organize'];
const RENDERED = 'canvas[data-rendered="true"]';
const COLD_TIMEOUT = 120_000;

/**
 * Vite compiles modules and optimises dependencies on first request. When
 * several workers hit a cold dev server at once, a late dependency discovery
 * triggers a full reload mid-test and the first pdf.js render blows its
 * assertion timeout. Visit every tool and render a document once (which boots
 * the pdf.js worker) so the specs run against a warm server. Fails loudly if
 * the server cannot render the fixture.
 */
async function warmUp(baseURL: string) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ baseURL });
    await page.goto('/', { waitUntil: 'load', timeout: COLD_TIMEOUT });
    for (const route of TOOL_ROUTES) {
      try {
        await page.goto(route, { waitUntil: 'load', timeout: COLD_TIMEOUT });
        await page
          .locator('input[type=file]')
          .first()
          .setInputFiles(FIXTURE, { timeout: COLD_TIMEOUT });
        await page
          .locator(RENDERED)
          .first()
          .waitFor({ state: 'attached', timeout: COLD_TIMEOUT });
      } catch (cause) {
        throw new Error(
          `E2E warm-up failed: ${route} did not render ${FIXTURE} (${RENDERED}) at ${baseURL}. Is the dev server healthy?`,
          { cause },
        );
      }
    }
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(config: FullConfig) {
  execSync('pnpm fixtures', { stdio: 'inherit' });
  const baseURL =
    config.projects[0]?.use.baseURL ?? config.webServer?.url ?? undefined;
  if (!baseURL)
    throw new Error('E2E warm-up: no baseURL or webServer url configured');
  await warmUp(baseURL);
}
