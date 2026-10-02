import { expect, test, type Page } from '@playwright/test';
import { pathOf } from './tool-routes';

/**
 * Every DataGrid instance at desktop and phone width: header labels are
 * never clipped, the grid is at least as tall as its header plus the rows it
 * shows (up to 12), and a horizontal scrollbar never covers a row.
 */

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

/** A small PNG drawn by the browser. */
async function png(page: Page, seed: number) {
  const b64 = await page.evaluate((seed) => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 48;
    const g = c.getContext('2d')!;
    g.fillStyle = `rgb(${seed * 40}, 120, 200)`;
    g.fillRect(0, 0, 64, 48);
    return c.toDataURL('image/png').split(',')[1];
  }, seed);
  return Buffer.from(b64, 'base64');
}

async function checkGrid(page: Page, name: string, headers: string[]) {
  const grid = page.getByRole('grid', { name, exact: true });
  await expect(grid).toBeVisible();
  await grid.scrollIntoViewIfNeeded();
  // Web fonts change the measured widths: check once they are in.
  await page.evaluate(() => document.fonts.ready);
  const m = await grid.evaluate((g: HTMLElement) => {
    const root = g.parentElement!;
    const header = root.querySelector<HTMLElement>(
      '[role="row"][aria-rowindex="1"]',
    )!;
    const row = g.querySelector<HTMLElement>('[role="row"]');
    return {
      rows: Number(g.getAttribute('aria-rowcount')) - 1,
      rowH: row ? row.getBoundingClientRect().height : 32,
      headerH: header.getBoundingClientRect().height,
      rootH: root.getBoundingClientRect().height,
      body: g.clientHeight,
      overflowX: g.scrollWidth > g.clientWidth,
      bar: g.offsetHeight - g.clientHeight,
      labels: [
        ...root.querySelectorAll<HTMLElement>('[data-grid-header-label]'),
      ].map((l) => ({
        text: l.textContent ?? '',
        clipped: l.scrollWidth > l.clientWidth,
      })),
    };
  });
  expect(m.labels.length).toBeGreaterThan(0);
  expect(m.labels.filter((l) => l.clipped)).toEqual([]);
  expect(m.labels[0].text).toBe(headers[0]);
  for (const l of m.labels) expect(headers).toContain(l.text);
  const shown = Math.max(1, Math.min(m.rows, 12));
  expect(m.rootH).toBeGreaterThanOrEqual(m.headerH + shown * m.rowH);
  // The body's client box excludes the scrollbar: every shown row fits.
  expect(m.body).toBeGreaterThanOrEqual(shown * m.rowH - 1);
  if (!m.overflowX) expect(m.bar).toBe(0);
}

for (const viewport of VIEWPORTS) {
  test.describe(`data grids at ${viewport.width} px`, () => {
    test.use({ viewport });

    test('kit gallery', async ({ page }) => {
      await page.goto('/__kit');
      const headers = [
        'Order',
        'Customer',
        'Country',
        'Placed',
        'Items',
        'Total',
        'Paid',
        'Note',
      ];
      await checkGrid(page, 'Orders', headers);
      await checkGrid(page, 'Orders with no match', headers);
    });

    test('CSV viewer', async ({ page }) => {
      await page.goto(pathOf('csv-viewer'));
      const csv =
        'name,size before,description\n' +
        Array.from(
          { length: 30 },
          (_, i) => `item${i},${i * 1000},a longer description of row ${i}`,
        ).join('\n');
      await page
        .locator('input[type=file]')
        .first()
        .setInputFiles({
          name: 'items.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(csv),
        });
      await checkGrid(page, 'Table data', [
        'name',
        'size before',
        'description',
      ]);
    });

    test('Mock data generator', async ({ page }) => {
      await page.goto(pathOf('random-data-generator'));
      await page.getByRole('button', { name: 'Generate', exact: true }).click();
      const grid = page.getByRole('grid', { name: 'Generated data' });
      await expect(grid).toBeVisible();
      const headers = await grid.evaluate((g) =>
        [...g.parentElement!.querySelectorAll('[data-grid-header-label]')].map(
          (l) => l.textContent ?? '',
        ),
      );
      await checkGrid(page, 'Generated data', headers);
    });

    test('Hash generator files', async ({ page }) => {
      await page.goto(pathOf('hash-generator'));
      await page.getByRole('tab', { name: 'Files' }).click();
      await page
        .locator('input[type=file]')
        .first()
        .setInputFiles([
          {
            name: 'notes.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('hello'),
          },
        ]);
      const grid = page.getByRole('grid', { name: 'File hashes' });
      await expect(grid.getByText('notes.txt')).toBeVisible();
      const headers = await grid.evaluate((g) =>
        [...g.parentElement!.querySelectorAll('[data-grid-header-label]')].map(
          (l) => l.textContent ?? '',
        ),
      );
      expect(headers.slice(0, 2)).toEqual(['Name', 'Size']);
      await checkGrid(page, 'File hashes', headers);
    });

    test('Image compressor batch', async ({ page }) => {
      await page.goto(pathOf('image-optimizer'));
      const files = await Promise.all(
        [1, 2].map(async (i) => ({
          name: `shot-${i}.png`,
          mimeType: 'image/png',
          buffer: await png(page, i),
        })),
      );
      await page.locator('input[type=file]').first().setInputFiles(files);
      await checkGrid(page, 'Files', [
        'Name',
        'Dimensions before',
        'Dimensions after',
        'Size before',
        'Size after',
        'Saving',
        'Status',
      ]);
    });

    test('EXIF remover', async ({ page }) => {
      await page.goto(pathOf('exif-tool'));
      await page
        .locator('input[type=file]')
        .first()
        .setInputFiles([
          'test/fixtures/generated/exif-gps.jpg',
          'test/fixtures/generated/exif-text.png',
        ]);
      await checkGrid(page, 'Files to clean', [
        'Name',
        'Status',
        'Risks',
        'Size before',
        'Size after',
      ]);
    });
  });
}
