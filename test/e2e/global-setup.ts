import { execSync } from 'node:child_process';
import { chromium, type FullConfig } from '@playwright/test';
import { toolRoutes } from './tool-routes';

const FIXTURE = 'test/fixtures/generated/text-3.pdf';
const RENDERED = 'canvas[data-rendered="true"]';

interface WarmRoute {
  route: string;
  fixture: string;
  /** Selector that appears once the tool has processed the fixture. */
  ready: string;
}
const pdfRoute = (route: string): WarmRoute => ({
  route,
  fixture: FIXTURE,
  ready: RENDERED,
});
/** A plain route warms up by rendering FIXTURE with pdf.js. */
const TOOL_ROUTES: (string | WarmRoute)[] = [
  '/pdf-merger',
  '/pdf-splitter',
  '/pdf-organize',
  '/pdf-to-images',
  '/pdf-to-text',
  '/pdf-watermark',
  '/pdf-page-numbers',
  '/pdf-sign',
  '/pdf-compressor',
  // Image tools show <img> previews rather than pdf.js canvases.
  {
    route: '/images-to-pdf',
    fixture: 'test/fixtures/generated/photo.png',
    ready: 'li[data-sortable-item] img',
  },
  // Fill Form renders no page canvas: it lists the form's fields.
  {
    route: '/pdf-fill-form',
    fixture: 'test/fixtures/generated/form.pdf',
    ready: 'label[for="field-0"]',
  },
];
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
    // Load every tool once so cold dependency optimisation (plotly, xyflow,
    // rive) can't reload a page mid-test.
    for (const tool of toolRoutes().filter((t) => t.enabled)) {
      await page.goto(`/${tool.id}`, {
        waitUntil: 'load',
        timeout: COLD_TIMEOUT,
      });
      await page
        .getByText(`Loading ${tool.name}…`)
        .waitFor({ state: 'detached', timeout: COLD_TIMEOUT });
    }
    for (const entry of TOOL_ROUTES) {
      const { route, fixture, ready } =
        typeof entry === 'string' ? pdfRoute(entry) : entry;
      try {
        await page.goto(route, { waitUntil: 'load', timeout: COLD_TIMEOUT });
        await page
          .locator('input[type=file]')
          .first()
          .setInputFiles(fixture, { timeout: COLD_TIMEOUT });
        await page
          .locator(ready)
          .first()
          .waitFor({ state: 'attached', timeout: COLD_TIMEOUT });
      } catch (cause) {
        throw new Error(
          `E2E warm-up failed: ${route} did not render ${fixture} (${ready}) at ${baseURL}. Is the dev server healthy?`,
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
