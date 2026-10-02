import { expect, test, type Page } from '@playwright/test';

/*
 * Kit layout guarantees (6-H): bars of tools stay one row that scrolls on
 * phones, and floating surfaces (tooltips) never leave the viewport.
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

test.describe('tooltip collision handling', () => {
  const corners = [
    { name: 'top left', left: 0, top: 0 },
    { name: 'top right', left: -1, top: 0 },
    { name: 'bottom left', left: 0, top: -1 },
    { name: 'bottom right', left: -1, top: -1 },
  ];

  for (const corner of corners) {
    test(`stays inside the viewport at the ${corner.name} corner`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 800, height: 600 });
      await page.goto('/__kit');
      // Any kit tooltip trigger: its wrapper holds the always-mounted
      // description (role=tooltip).
      const wrapper = page
        .locator('span.relative.inline-flex:has(> [role="tooltip"])')
        .first();
      await wrapper.scrollIntoViewIfNeeded();
      // Pin the trigger to the corner (test-only DOM change).
      await wrapper.evaluate((el, c) => {
        const box = el as HTMLElement;
        box.style.position = 'fixed';
        box.style.zIndex = '9999';
        box.style.left = c.left < 0 ? 'auto' : '0px';
        box.style.right = c.left < 0 ? '0px' : 'auto';
        box.style.top = c.top < 0 ? 'auto' : '0px';
        box.style.bottom = c.top < 0 ? '0px' : 'auto';
      }, corner);
      await wrapper.hover();
      const bubble = page.locator('[data-tooltip-bubble]');
      await expect(bubble).toBeVisible();
      await expect(bubble).toHaveCSS('opacity', '1');
      const r = (await bubble.boundingBox())!;
      expect(r.x).toBeGreaterThanOrEqual(7.5);
      expect(r.y).toBeGreaterThanOrEqual(7.5);
      expect(r.x + r.width).toBeLessThanOrEqual(800 - 7.5);
      expect(r.y + r.height).toBeLessThanOrEqual(600 - 7.5);
      // The arrow still points at the trigger after the shift.
      const t = (await wrapper.boundingBox())!;
      const a = (await bubble.locator('[data-tooltip-arrow]').boundingBox())!;
      const arrowCentre = a.x + a.width / 2;
      expect(arrowCentre).toBeGreaterThanOrEqual(t.x - 1);
      expect(arrowCentre).toBeLessThanOrEqual(t.x + t.width + 1);
    });
  }
});
