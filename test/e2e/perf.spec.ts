import { mkdirSync, writeFileSync } from 'node:fs';
import { test } from '@playwright/test';

/*
 * Workspace performance on large-300.pdf (spec §14). Measured, not gated:
 * run with `pnpm test:e2e --grep @perf`; results go to test-results/perf.json.
 */
const FILE = 'test/fixtures/generated/large-300.pdf';

test('@perf workspace on large-300.pdf', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    const w = window as unknown as { __longTasks: number[] };
    w.__longTasks = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) w.__longTasks.push(e.duration);
      }).observe({ type: 'longtask', buffered: true });
    } catch {
      // longtask is Chromium-only.
    }
  });
  await page.goto('/pdf/edit');
  const t0 = Date.now();
  await page.locator('input[type=file]').first().setInputFiles(FILE);
  await page
    .locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]')
    .waitFor({ state: 'attached', timeout: 60_000 });
  const firstPageMs = Date.now() - t0;

  // Scroll for 3 s and count animation frames.
  const doc = page.getByRole('region', { name: 'Document' });
  const box = (await doc.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number; __counting: boolean };
    w.__frames = 0;
    w.__counting = true;
    const tick = () => {
      if (!w.__counting) return;
      w.__frames++;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const scrollStart = Date.now();
  while (Date.now() - scrollStart < 3000) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(16);
  }
  const frames = await page.evaluate(() => {
    const w = window as unknown as { __frames: number; __counting: boolean };
    w.__counting = false;
    return w.__frames;
  });
  const fps = frames / ((Date.now() - scrollStart) / 1000);

  // Rotate the current page: time until its slot changes shape (fit-width
  // keeps the width, so compare the aspect ratio).
  await doc.evaluate((el) => {
    el.scrollTop = 0;
  });
  await page
    .locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]')
    .waitFor({ state: 'attached' });
  // Measured in the page: R, then animation frames until the slot's shape
  // changes (fit-width keeps the width, so compare the aspect ratio).
  const rotateMs = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const slot = () =>
          document.querySelector('[data-testid="page-slot-1"]')!;
        const aspect = () => {
          const r = slot().getBoundingClientRect();
          return r.width / r.height;
        };
        const before = aspect();
        const t0 = performance.now();
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'r', bubbles: true }),
        );
        const check = () =>
          Math.abs(aspect() - before) > 0.01
            ? resolve(performance.now() - t0)
            : requestAnimationFrame(check);
        requestAnimationFrame(check);
      }),
  );

  // Export.
  await page
    .getByRole('button', { name: /^Export/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'Export PDF' });
  const e0 = Date.now();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    dialog.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  const exportMs = Date.now() - e0;
  await download.path();

  const longTasks = await page.evaluate(
    () => (window as unknown as { __longTasks: number[] }).__longTasks,
  );
  const result = {
    file: 'large-300.pdf',
    firstPageMs,
    scrollFps: Math.round(fps),
    rotateMs: Math.round(rotateMs),
    exportMs,
    longTasks: {
      count: longTasks.length,
      maxMs: Math.round(Math.max(0, ...longTasks)),
    },
    budgets: {
      firstPageMs: 1500,
      scrollFps: 50,
      rotateMs: 50,
      exportMs: 15000,
      longTaskMaxMs: 100,
    },
  };
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/perf.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
});
