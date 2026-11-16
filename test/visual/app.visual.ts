import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../e2e/tool-routes';
import { makeTextPdf } from '../fixtures/builders';
import {
  expectAxeClean,
  setTheme,
  stabilise,
  touchFullPage,
  type Theme,
} from './helpers';

/*
 * The redesigned app on Cynosure (redesign spec, rule 6): Home, a category
 * hub, Not found, the two pattern tools (PDF Merger, a file tool; JWT
 * Decoder, a transform tool), a data tool (CSV Viewer with a table) and a
 * chart tool (CSV Viewer's chart view), each in light and dark at desktop
 * (1440) and phone (390, touch) width, with an axe check.
 *
 * Baselines are not committed from a workstation: CI's pinned container
 * writes them (workflow_dispatch with `update`).
 */

const WIDTHS = {
  desktop: { width: 1440, height: 900 },
  phone: { width: 390, height: 844 },
} as const;
type Width = keyof typeof WIDTHS;

const CSV =
  'name,team,score\n' +
  [
    ['Ada', 'red', 41],
    ['Grace', 'blue', 85],
    ['Alan', 'red', 36],
    ['Barbara', 'green', 40],
    ['Edsger', 'blue', 72],
    ['Frances', 'green', 58],
  ]
    .map((r) => r.join(','))
    .join('\n');

/** A token with fixed claims: the page shows the same decode every run. */
function sampleJwt(): string {
  const part = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  return [
    part({ alg: 'HS256', typ: 'JWT' }),
    part({ sub: '1234567890', name: 'Ada Lovelace', iat: 1516239022 }),
    'c2lnbmF0dXJl',
  ].join('.');
}

/** A text PDF built here, so the suite needs no generated fixtures. */
async function pdf(name: string, pages: number, label: string) {
  return {
    name,
    mimeType: 'application/pdf',
    buffer: Buffer.from(await makeTextPdf({ pages, label })),
  };
}

async function loadCsv(page: Page) {
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'scores.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(CSV),
    });
  await expect(page.getByRole('grid', { name: 'Table data' })).toBeVisible();
}

interface Shot {
  name: string;
  path: string;
  /** Brings the page to the state worth a picture. */
  prepare?(page: Page): Promise<void>;
}

const SHOTS: Shot[] = [
  { name: 'home', path: '/' },
  { name: 'hub-data', path: '/data' },
  { name: 'not-found', path: '/regex-tester' },
  {
    name: 'pdf-merger',
    path: pathOf('pdf-merger'),
    async prepare(page) {
      await page
        .locator('input[type=file]')
        .first()
        .setInputFiles([
          await pdf('text-3.pdf', 3, 'Alpha'),
          await pdf('text-12.pdf', 12, 'Beta'),
        ]);
      const rows = page
        .getByRole('list', { name: 'Files to merge' })
        .getByRole('listitem');
      await expect(rows).toHaveCount(2);
      // Thumbnails come from the pdf.js worker.
      for (const name of ['text-3.pdf', 'text-12.pdf'])
        await expect
          .poll(() =>
            page
              .getByRole('img', { name: `${name}, page 1` })
              .evaluate((i) => (i as HTMLImageElement).naturalWidth),
          )
          .toBeGreaterThan(0);
    },
  },
  {
    name: 'jwt-decode',
    path: pathOf('jwt-decode'),
    async prepare(page) {
      await page.getByRole('textbox', { name: 'JWT token' }).fill(sampleJwt());
      await expect(page.getByText('Ada Lovelace').first()).toBeVisible();
    },
  },
  { name: 'csv-viewer-table', path: pathOf('csv-viewer'), prepare: loadCsv },
  {
    name: 'csv-viewer-chart',
    path: pathOf('csv-viewer'),
    async prepare(page) {
      await loadCsv(page);
      await page
        .getByRole('radiogroup', { name: 'View' })
        .getByRole('radio', { name: 'Chart' })
        .check();
      await expect(page.getByRole('img', { name: /chart of/ })).toBeVisible();
    },
  },
];

async function open(page: Page, shot: Shot, theme: Theme) {
  await page.goto(shot.path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await setTheme(page, theme);
  // Lazy tool chunks: wait until no loading state remains.
  await expect(
    page.getByRole('status').filter({ hasText: /^Loading/ }),
  ).toHaveCount(0, { timeout: 30_000 });
  await shot.prepare?.(page);
  await stabilise(page);
}

for (const [width, viewport] of Object.entries(WIDTHS) as [
  Width,
  (typeof WIDTHS)[Width],
][])
  for (const theme of ['light', 'dark'] as const)
    test.describe(`app ${width} ${theme}`, () => {
      test.use(width === 'phone' ? { viewport, hasTouch: true } : { viewport });

      for (const shot of SHOTS)
        test(shot.name, async ({ page }) => {
          await open(page, shot, theme);
          if (width === 'phone') {
            await touchFullPage(page, viewport.width);
            await expect(page).toHaveScreenshot(
              `${shot.name}-${width}-${theme}.png`,
            );
          } else
            await expect(page).toHaveScreenshot(
              `${shot.name}-${width}-${theme}.png`,
              { fullPage: true },
            );
          await expectAxeClean(page);
        });
    });
