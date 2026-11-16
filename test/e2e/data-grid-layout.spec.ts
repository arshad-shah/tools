import { expect, test, type Locator, type Page } from '@playwright/test';
import { pathOf } from './tool-routes';

/**
 * Every DataGrid instance at desktop and phone width: header labels are
 * never clipped, the grid is at least as tall as its header plus the rows it
 * shows (up to 12), and a horizontal scrollbar never covers a row. Tools whose
 * redesign shows files in a Table or a list keep every row on screen.
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

/**
 * A grid's column headers, in order, by text. Cynosure's DataGrid holds its
 * header row; the kit grid renders it just above, in the same parent.
 */
async function headersOf(page: Page, name: string) {
  const headers = page
    .getByRole('grid', { name, exact: true })
    .locator('xpath=..')
    .getByRole('columnheader');
  await expect(headers.first()).toBeVisible();
  // The label alone: the kit header also holds a type badge and its
  // visually hidden description.
  return headers.evaluateAll((hs) =>
    hs.map((h) =>
      (
        h.querySelector(
          '[data-grid-header-label], .cy-data-grid-label, .cy-sort-button-label',
        ) ?? h
      ).textContent!.trim(),
    ),
  );
}

/**
 * Every row is on screen: inside the viewport's width, or inside a
 * horizontal scroller that is (a wide table scrolls in its own box). The
 * page itself never scrolls sideways.
 */
async function checkFits(page: Page, rows: Locator) {
  const width = page.viewportSize()!.width;
  for (const row of await rows.all()) {
    const box = await row.evaluate((el) => {
      let box: Element = el;
      for (let a = el.parentElement; a; a = a.parentElement)
        if (/auto|scroll/.test(getComputedStyle(a).overflowX)) {
          box = a;
          break;
        }
      const r = box.getBoundingClientRect();
      return { left: r.left, right: r.right };
    });
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(width);
  }
  expect(
    await page.evaluate(
      () => document.scrollingElement!.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function checkGrid(page: Page, name: string, headers: string[]) {
  const grid = page.getByRole('grid', { name, exact: true });
  await expect(grid).toBeVisible();
  await grid.scrollIntoViewIfNeeded();
  // Web fonts change the measured widths: check once they are in.
  await page.evaluate(() => document.fonts.ready);
  expect(await headersOf(page, name)).toEqual(headers);
  const m = await grid.evaluate((g: HTMLElement) => {
    const header = g
      .closest('[role="grid"]')!
      .parentElement!.querySelector<HTMLElement>(
        '[role="row"][aria-rowindex="1"]',
      )!;
    const row = g.querySelector<HTMLElement>(
      '[role="row"]:not([aria-rowindex="1"])',
    );
    const box = (el: Element) => el.getBoundingClientRect();
    return {
      rows: Number(g.getAttribute('aria-rowcount')) - 1,
      rowH: row ? box(row).height : 32,
      headerH: box(header).height,
      // The header sits inside the grid (Cynosure) or just above it (kit).
      headerInside: g.contains(header),
      body: g.clientHeight,
      overflowX: g.scrollWidth > g.clientWidth,
      bar: g.offsetHeight - g.clientHeight,
      // A header label whose text overflows its box is clipped (visually
      // hidden descriptions are clipped on purpose and not checked).
      clipped: [
        ...header.querySelectorAll<HTMLElement>('[role="columnheader"]'),
      ]
        .map(
          (h) =>
            h.querySelector<HTMLElement>(
              '[data-grid-header-label], .cy-data-grid-label, .cy-sort-button-label',
            ) ?? h,
        )
        .filter((el) => el.scrollWidth > el.clientWidth)
        .map((el) => el.textContent),
    };
  });
  expect(m.clipped, 'clipped header labels').toEqual([]);
  // The kit grid grew to 12 rows; Cynosure's DataGrid is a fixed
  // 12-control-height box (header included), which shows 10 whole rows.
  const shown = Math.max(1, Math.min(m.rows, m.headerInside ? 10 : 12));
  // The body's client box excludes the scrollbar: every shown row fits.
  const needed = shown * m.rowH + (m.headerInside ? m.headerH : 0);
  expect(m.body).toBeGreaterThanOrEqual(needed - 1);
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
      await expect(
        page.getByRole('grid', { name: 'Generated data' }),
      ).toBeVisible();
      const headers = await headersOf(page, 'Generated data');
      expect(headers.length).toBeGreaterThan(0);
      await checkGrid(page, 'Generated data', headers);
    });

    // The redesign shows file hashes in a Table and image batches in a
    // list (not a grid): the same guarantees, every row whole and on screen.
    test('Hash generator files', async ({ page }) => {
      await page.goto(pathOf('hash-generator'));
      await page.getByRole('radio', { name: 'Files' }).click();
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
      const table = page.getByRole('table', { name: 'File hashes' });
      await expect(table.getByText('notes.txt', { exact: true })).toBeVisible();
      const headers = (
        await table.getByRole('columnheader').allInnerTexts()
      ).map((t) => t.trim());
      expect(headers.slice(0, 2)).toEqual(['Name', 'Size']);
      await checkFits(page, table.getByRole('row'));
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
      const rows = page
        .getByRole('list', { name: 'Files' })
        .getByRole('listitem');
      await expect(rows).toHaveCount(2);
      for (const name of ['shot-1.png', 'shot-2.png'])
        await expect(rows.getByText(name, { exact: true })).toBeVisible();
      await checkFits(page, rows);
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
      const rows = page
        .getByRole('list', { name: 'Photos' })
        .getByRole('listitem');
      await expect(rows).toHaveCount(2);
      for (const name of ['exif-gps.jpg', 'exif-text.png'])
        await expect(rows.getByText(name, { exact: true })).toBeVisible();
      await checkFits(page, rows);
    });
  });
}
