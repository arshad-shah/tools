import { execSync } from 'node:child_process';
import { chromium, type FullConfig, type Page } from '@playwright/test';
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
  // The workspace: compiles the shell, the Organize mode and the edit path.
  {
    route: '/pdf/edit',
    fixture: FIXTURE,
    ready: '[data-testid="page-slot-1"] canvas[data-rendered="true"]',
  },
  '/pdf/merge',
  '/pdf/split',
  '/pdf/to-images',
  '/pdf/to-text',
  '/pdf/compress',
  '/pdf/protect',
  // Image tools show <img> previews rather than pdf.js canvases.
  {
    route: '/pdf/images-to-pdf',
    fixture: 'test/fixtures/generated/photo.png',
    ready: 'li[data-sortable-item] img',
  },
  // Fill & Sign: the mode's chunk and the render worker's detection.
  {
    route: '/pdf/edit/fill-sign',
    fixture: 'test/fixtures/generated/flat-form-word.pdf',
    ready: '[data-testid^="field-"]',
  },
  // Unlock takes the encrypted file as it is and asks for its password.
  {
    route: '/pdf/unlock',
    fixture: 'test/fixtures/generated/encrypted-aes.pdf',
    ready: 'input[type=password]',
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
  // A fresh tab per visit: a dev-server page holds a file descriptor for each
  // of its ~400 module responses until the old document is collected, so ~40
  // navigations in one tab exhaust the descriptor limit
  // (net::ERR_INSUFFICIENT_RESOURCES). Closing the tab releases them.
  const visit = async (route: string, step: (page: Page) => Promise<void>) => {
    const page = await browser.newPage({ baseURL });
    try {
      await page.goto(route, { waitUntil: 'load', timeout: COLD_TIMEOUT });
      await step(page);
    } finally {
      await page.close();
    }
  };
  try {
    await visit('/', async () => {});
    // Load every tool once so cold dependency optimisation (xyflow,
    // rive) can't reload a page mid-test.
    for (const tool of toolRoutes().filter((t) => t.enabled)) {
      await visit(tool.path, (page) =>
        page
          .getByText(`Loading ${tool.name}`, { exact: true })
          .waitFor({ state: 'detached', timeout: COLD_TIMEOUT }),
      );
    }
    // Non-PDF runs can skip the pdf.js warm-up (it times out in cloud
    // sandbox containers): E2E_SKIP_PDF_WARMUP=1.
    const pdfRoutes = process.env.E2E_SKIP_PDF_WARMUP ? [] : TOOL_ROUTES;
    for (const entry of pdfRoutes) {
      const { route, fixture, ready } =
        typeof entry === 'string' ? pdfRoute(entry) : entry;
      try {
        await visit(route, async (page) => {
          await page
            .locator('input[type=file]')
            .first()
            .setInputFiles(fixture, { timeout: COLD_TIMEOUT });
          await page
            .locator(ready)
            .first()
            .waitFor({ state: 'attached', timeout: COLD_TIMEOUT });
        });
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
  // OCR engine and language data, same-origin (a reused dev server may predate them).
  execSync('node scripts/copy-ocr-assets.mjs', { stdio: 'inherit' });
  const baseURL =
    config.projects[0]?.use.baseURL ?? config.webServer?.url ?? undefined;
  if (!baseURL)
    throw new Error('E2E warm-up: no baseURL or webServer url configured');
  await warmUp(baseURL);
}
