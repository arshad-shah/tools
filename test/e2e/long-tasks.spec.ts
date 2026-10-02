import { expect, test, type Page } from '@playwright/test';
import { pathOf } from './tool-routes';

/*
 * The long-task gate (H-2): the large-input flows fail on any main-thread
 * task over 100 ms. Tracing is off: its DOM snapshots run on the page's main
 * thread and would be counted against the app.
 */
test.use({ trace: 'off' });

const tree = (page: Page) => page.getByRole('tree', { name: 'Document tree' });
const show = (page: Page, name: string) =>
  page.getByRole('tab', { name, exact: true }).click();

/** The status line only: a page-wide text search would scan the 20 MB editor. */
const status = (page: Page) => page.locator('[data-status-line]').first();

async function observeLongTasks(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { longTasks: number[] };
    w.longTasks = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.longTasks.push(e.duration);
    }).observe({ type: 'longtask' });
  });
  return () =>
    page.evaluate(
      () => (window as unknown as { longTasks: number[] }).longTasks,
    );
}

test('a 20 MB file parses in the background and the Tree scrolls smoothly', async ({
  page,
}) => {
  test.slow();
  await page.goto(pathOf('json-and-xml-viewer'));
  const start = Date.now();
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles('test/fixtures/generated/large.json');
  await expect(status(page).getByText('Parsed', { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  test.info().annotations.push({
    type: 'open-and-parse-ms',
    description: String(Date.now() - start),
  });
  await show(page, 'Tree');
  await expect(tree(page)).toBeVisible();
  const longTasks = await observeLongTasks(page);
  await tree(page).hover();
  for (let i = 0; i < 50; i++) await page.mouse.wheel(0, 800);
  const long = await longTasks();
  test.info().annotations.push({
    type: 'long-tasks',
    description: JSON.stringify(long),
  });
  // The long-task gate (H-2): no main-thread task over 100 ms.
  expect(long.filter((d) => d > 100)).toEqual([]);
});

test('the Map lays out 5,000 cards in the worker without blocking', async ({
  page,
}) => {
  test.slow();
  await page.goto(pathOf('json-and-xml-viewer'));
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles('test/fixtures/generated/map-5000.json');
  await expect(status(page).getByText('Parsed', { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole('tab', { name: 'Map' }).click();
  await expect(page.getByTestId('diagram-canvas')).toBeVisible();
  // The canvas summary ("Map of N objects…") changes once the new cap lays out.
  const summary = () =>
    page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="diagram-canvas"]');
      const id = canvas?.getAttribute('aria-describedby') ?? '';
      return document.getElementById(id)?.textContent ?? '';
    });
  const before = await summary();
  const longTasks = await observeLongTasks(page);
  // CSS and in-page checks only while observing: a text or label locator
  // walks the whole DOM on the main thread and would count as a long task.
  await page.locator('#json-xml-node-cap').selectOption('5000');
  await expect.poll(summary).not.toBe(before);
  await page.waitForTimeout(500);
  const long = await longTasks();
  test.info().annotations.push({
    type: 'long-tasks',
    description: JSON.stringify(long),
  });
  // Layout runs in the worker: the main thread stays under 100 ms a task.
  expect(long.filter((d) => d > 100)).toEqual([]);
});

test('scrolling large.csv has no long task over 100 ms', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(pathOf('csv-viewer'));
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles('test/fixtures/generated/large.csv');
  const grid = page.getByRole('grid', { name: 'Table data' });
  await expect(grid).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('500,000 of 500,000 rows')).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { longTasks: number[] }).longTasks = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        (window as unknown as { longTasks: number[] }).longTasks.push(
          e.duration,
        );
    }).observe({ type: 'longtask', buffered: false });
  });
  await grid.hover();
  for (let i = 0; i < 20; i++) await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(300);
  const tasks = await page.evaluate(
    () => (window as unknown as { longTasks: number[] }).longTasks,
  );
  expect(Math.max(0, ...tasks)).toBeLessThan(100);
});
