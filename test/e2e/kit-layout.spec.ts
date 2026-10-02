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

  test('is one row that scrolls sideways, with an edge fade', async ({
    page,
  }) => {
    await openWorkspace(page);
    const bar = page.getByRole('toolbar', { name: 'Organize tools' });
    await expect(bar).toBeVisible();
    const metrics = await bar.evaluate((el) => ({
      tops: [
        ...new Set([...el.querySelectorAll('button')].map((b) => b.offsetTop)),
      ],
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      fade: el.dataset.fade,
      sizes: [...el.querySelectorAll('button[aria-label]')]
        .filter((b) => !b.getAttribute('aria-label')!.endsWith('options'))
        .map((b) => Math.round(b.getBoundingClientRect().height)),
    }));
    // Every tool shares one offsetTop: a single row, never wrapped.
    expect(metrics.tops).toHaveLength(1);
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
    expect(metrics.fade).toBe('end');
    // 44px touch targets stay.
    for (const h of metrics.sizes) expect(h).toBeGreaterThanOrEqual(44);
    // The page itself never scrolls sideways.
    expect(
      await page.evaluate(
        () => document.scrollingElement!.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    await bar.evaluate((el) => el.scrollBy({ left: 10_000 }));
    await expect
      .poll(() => bar.evaluate((el) => el.dataset.fade))
      .toBe('start');
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
