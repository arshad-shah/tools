import { expect, test, type Page } from '@playwright/test';

/*
 * Kit layout guarantees (6-H): bars of tools stay one row that scrolls on
 * phones (floating surfaces are covered by kit-floating.spec.ts).
 */

const PDF = 'test/fixtures/generated/text-3.pdf';

async function openWorkspace(page: Page) {
  await page.goto('/pdf/edit');
  await page.locator('input[type=file]').first().setInputFiles(PDF);
  await expect(
    page
      .locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]')
      .first(),
  ).toBeVisible({ timeout: 60_000 });
}

test.describe('phone workspace toolbar', () => {
  test.use({
    viewport: { width: 360, height: 760 },
    hasTouch: true,
    isMobile: true,
  });

  test('is one row that scrolls sideways', async ({ page }) => {
    await openWorkspace(page);
    const bar = page.getByRole('toolbar', { name: 'Organize tools' });
    await expect(bar).toBeVisible();
    const metrics = await bar.evaluate((el) => {
      const buttons = [...el.querySelectorAll('button')].filter(
        (b) => b.getBoundingClientRect().width > 0,
      );
      const scrollers = [el, ...el.querySelectorAll('*')].filter(
        (n) =>
          ['auto', 'scroll'].includes(getComputedStyle(n).overflowX) &&
          n.scrollWidth > n.clientWidth,
      );
      return {
        // Centre lines: tools of different heights share one row.
        rows: [
          ...new Set(
            buttons.map((b) => {
              const r = b.getBoundingClientRect();
              return Math.round((r.top + r.height / 2) / 4);
            }),
          ),
        ],
        scrolls: scrollers.length > 0,
        // Cynosure grows a 40px button's hit area to --_hit (44px).
        sizes: buttons.map((b) =>
          Math.max(
            b.getBoundingClientRect().height,
            parseFloat(getComputedStyle(b).getPropertyValue('--_hit')) || 0,
          ),
        ),
      };
    });
    expect(metrics.rows).toHaveLength(1);
    expect(metrics.scrolls).toBe(true);
    for (const h of metrics.sizes) expect(h).toBeGreaterThanOrEqual(44);
    // The page itself never scrolls sideways.
    expect(
      await page.evaluate(
        () => document.scrollingElement!.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });

  test('arrow keys move across the row and keep the focused tool in view', async ({
    page,
  }) => {
    await openWorkspace(page);
    const bar = page.getByRole('toolbar', { name: 'Organize tools' });
    const first = bar.getByRole('button').first();
    await first.focus();
    await page.keyboard.press('End');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
    const inView = await focused.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const s = el.closest('[role="toolbar"]')!.getBoundingClientRect();
      return r.left >= s.left - 1 && r.right <= s.right + 1;
    });
    expect(inView).toBe(true);
    await page.keyboard.press('Home');
    await expect(first).toBeFocused();
  });
});
