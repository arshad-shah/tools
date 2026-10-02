import { expect, test, type Page } from '@playwright/test';
import { rendered } from './workspace-helpers';

/*
 * Workspace layout (P5-G, owner phone feedback): one scrolling row per bar,
 * no sideways page scroll, 44px targets on phones, labels on desktop, and
 * tooltips that stay inside the viewport.
 */
const FILE = 'test/fixtures/generated/text-3.pdf';
const MODES = [
  'organize',
  'edit',
  'annotate',
  'fill-sign',
  'redact',
  'convert',
  'protect',
  'optimize',
  'ocr',
];

async function openAt(page: Page, mode: string) {
  await page.goto(`/pdf/edit/${mode}`);
  await page.locator('input[type=file]').first().setInputFiles(FILE);
  await expect(rendered(page)).toBeAttached();
  await expect(page.getByRole('toolbar').first()).toBeVisible();
}

/** Layout facts the owner asked for, measured in the page. */
function measure(page: Page) {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        r.width > 1 &&
        r.height > 1 &&
        cs.visibility !== 'hidden' &&
        cs.display !== 'none' &&
        !el.closest('[aria-hidden="true"]')
      );
    };
    const bars = [
      ...document.querySelectorAll('[role="toolbar"], [role="tablist"]'),
    ].filter(visible);
    const rows = bars.map((bar) => {
      const items = [
        ...bar.querySelectorAll('button, [role="tab"], input'),
      ].filter(visible);
      const tops = new Set(
        items.map((el) => {
          const r = el.getBoundingClientRect();
          // Centre line: items of different heights share one row.
          return Math.round(r.top + r.height / 2);
        }),
      );
      return {
        bar: bar.getAttribute('aria-label'),
        rows: [...tops].length,
        spread: Math.max(...tops) - Math.min(...tops),
      };
    });
    const chrome = [
      ...document.querySelectorAll(
        'header[role="banner"], [role="toolbar"], nav[aria-label="Modes"]',
      ),
    ];
    const small = chrome
      .flatMap((c) => [
        ...c.querySelectorAll('button, a[href], input, [role="tab"]'),
      ])
      .filter(visible)
      .map((el) => {
        // A kit Input's whole box is its target.
        const box = el.closest('[data-field-box]') ?? el;
        const r = box.getBoundingClientRect();
        return {
          name:
            el.getAttribute('aria-label') ??
            el.textContent?.trim() ??
            el.tagName,
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      })
      .filter((t) => t.w < 44 || t.h < 44);
    return {
      scrollWidth: document.scrollingElement!.scrollWidth,
      innerWidth: window.innerWidth,
      rows,
      small,
    };
  });
}

for (const width of [360, 390, 414])
  test.describe(`phone ${width}px`, () => {
    test.use({ viewport: { width, height: 800 }, hasTouch: true });
    for (const mode of MODES)
      test(`${mode}: one row per bar, no page scroll, 44px targets`, async ({
        page,
      }) => {
        await openAt(page, mode);
        const m = await measure(page);
        expect(m.scrollWidth).toBeLessThanOrEqual(m.innerWidth);
        for (const r of m.rows)
          expect(
            r.spread,
            `${r.bar} wraps to ${r.rows} rows`,
          ).toBeLessThanOrEqual(2);
        expect(m.small).toEqual([]);
      });
  });

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('toolbar, top bar and tabs show labels beside the icons', async ({
    page,
  }) => {
    await openAt(page, 'organize');
    const bar = page.getByRole('toolbar', { name: /Organize tools/ });
    const first = bar.getByRole('button').first();
    expect((await first.innerText()).trim().length).toBeGreaterThan(0);
    const undo = page.getByRole('banner').getByRole('button', {
      name: /undo/i,
    });
    await expect(undo).toHaveText('Undo');
    const m = await measure(page);
    for (const r of m.rows)
      expect(r.spread, JSON.stringify(r)).toBeLessThanOrEqual(2);
  });

  test('the default zoom reads at no more than 125 percent', async ({
    page,
  }) => {
    await openAt(page, 'organize');
    const box = (await page
      .locator('[data-testid="page-slot-1"]')
      .boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(612 * 1.25 + 1);
    expect(box.width).toBeGreaterThan(612 * 0.8);
  });
});

async function tooltipInside(page: Page, trigger: ReturnType<Page['locator']>) {
  // One bubble at a time: the last one closes once the pointer leaves.
  await page.mouse.move(0, 0);
  await expect(page.locator('[data-tooltip-bubble]')).toHaveCount(0);
  await trigger.hover();
  const bubble = page.locator('[data-tooltip-bubble]');
  await expect(bubble).toBeVisible();
  await expect(bubble).toHaveCSS('opacity', '1');
  const b = (await bubble.boundingBox())!;
  const vw = page.viewportSize()!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(vw.width);
  expect(b.y + b.height).toBeLessThanOrEqual(vw.height);
}

for (const size of [
  { width: 1440, height: 900 },
  { width: 390, height: 800 },
])
  test(`tooltips of the leftmost tools stay inside the viewport at ${size.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await openAt(page, 'fill-sign');
    const bar = page.getByRole('toolbar', { name: /Fill & Sign tools/ });
    const buttons = bar.getByRole('button');
    for (const i of [0, 1]) await tooltipInside(page, buttons.nth(i));
    await tooltipInside(
      page,
      bar.getByRole('button', { name: /Next empty field/ }),
    );
  });

// Annotate pins its comments inspector, a Focus popover (backlog P5-D).
for (const mode of ['annotate']) {
  test(`the Focus inspector of ${mode} stays inside the viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAt(page, mode);
    await page.keyboard.press('f');
    const panel = page.getByRole('dialog').first();
    await expect(panel).toBeVisible();
    await expect
      .poll(async () => {
        const b = (await panel.boundingBox())!;
        return (
          b.x >= 0 && b.y >= 0 && b.x + b.width <= 1440 && b.y + b.height <= 900
        );
      })
      .toBe(true);
  });
}
