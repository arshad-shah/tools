import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * Floating surfaces never clip (owner feedback): the kit positioner flips,
 * shifts and shrinks them to stay inside the viewport, keeps the tooltip
 * arrow on its trigger, and portals them out of clipping ancestors.
 */

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
const CORNERS: Corner[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
];

/** Pins an element at a viewport corner (its React tree is unchanged). */
async function pin(el: Locator, corner: Corner) {
  await el.evaluate((node, c) => {
    const s = (node as HTMLElement).style;
    s.position = 'fixed';
    s.zIndex = '1';
    s.top = s.bottom = s.left = s.right = '';
    s[c.startsWith('top') ? 'top' : 'bottom'] = '0px';
    s[c.endsWith('left') ? 'left' : 'right'] = '0px';
  }, corner);
}

async function expectInsideViewport(page: Page, el: Locator) {
  const vp = page.viewportSize()!;
  await expect
    .poll(async () => {
      const b = await el.boundingBox();
      return (
        !!b &&
        b.x >= 0 &&
        b.y >= 0 &&
        b.x + b.width <= vp.width &&
        b.y + b.height <= vp.height
      );
    })
    .toBe(true);
}

async function openKit(page: Page) {
  await page.goto('/__kit');
  await expect(
    page.getByRole('heading', { name: 'Kit gallery' }),
  ).toBeVisible();
}

const undo = (page: Page) =>
  page.getByTestId('kit-section-buttons').getByRole('button', { name: 'Undo' });
const bubble = (page: Page) => page.locator('[data-tooltip-bubble]');

async function hoverAtCorners(page: Page) {
  const button = undo(page);
  // The Tooltip wrapper is the trigger's parent.
  const wrapper = button.locator('xpath=..');
  for (const corner of CORNERS) {
    await page.mouse.move(400, 400);
    await expect(bubble(page)).toHaveCount(0);
    await pin(wrapper, corner);
    await button.hover();
    await expect(bubble(page)).toBeVisible();
    await expectInsideViewport(page, bubble(page));
    // Flipped below the trigger at the top edge, above it at the bottom.
    await expect(bubble(page)).toHaveAttribute(
      'data-side',
      corner.startsWith('top') ? 'bottom' : 'top',
    );
    // The arrow still points at the trigger after the bubble shifted.
    const arrow = await bubble(page)
      .locator('[data-tooltip-arrow]')
      .boundingBox();
    const trigger = await button.boundingBox();
    const mid = arrow!.x + arrow!.width / 2;
    expect(mid).toBeGreaterThanOrEqual(trigger!.x);
    expect(mid).toBeLessThanOrEqual(trigger!.x + trigger!.width);
  }
}

test('icon button tooltips stay inside the viewport at all four edges', async ({
  page,
}) => {
  await openKit(page);
  await hoverAtCorners(page);
});

test('the same holds in a right-to-left document', async ({ page }) => {
  await openKit(page);
  await page.evaluate(() =>
    document.documentElement.setAttribute('dir', 'rtl'),
  );
  await hoverAtCorners(page);
});

test('a tooltip escapes a clipping, transformed scroll container', async ({
  page,
}) => {
  await openKit(page);
  const section = page.getByTestId('kit-section-buttons');
  await section.evaluate((s) => {
    Object.assign((s as HTMLElement).style, {
      overflow: 'auto',
      maxHeight: '160px',
      transform: 'translateZ(0)',
    });
  });
  const button = undo(page);
  await button.scrollIntoViewIfNeeded();
  await button.hover();
  await expect(bubble(page)).toBeVisible();
  // Portaled to body: no ancestor's overflow can cut it.
  expect(
    await bubble(page).evaluate((b) => b.parentElement === document.body),
  ).toBe(true);
  await expectInsideViewport(page, bubble(page));
  // It follows the trigger when the container scrolls.
  const before = (await bubble(page).boundingBox())!.y;
  const top = (await button.boundingBox())!.y;
  await section.evaluate((s) => s.scrollBy(0, -20));
  await expect
    .poll(async () => {
      const b = (await button.boundingBox())!.y;
      return Math.round(
        (await bubble(page).boundingBox())!.y - before - (b - top),
      );
    })
    .toBe(0);
});

test('a dropdown menu at the bottom-right corner opens inside the viewport', async ({
  page,
}) => {
  await openKit(page);
  const trigger = page.getByRole('button', { name: 'Menu' });
  // The DropdownMenu root is the trigger's parent.
  await pin(trigger.locator('xpath=..'), 'bottom-right');
  await trigger.click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expectInsideViewport(page, menu);
  await expect(menu).toHaveAttribute('data-side', 'top');
  await page.getByRole('menuitem', { name: 'Rename' }).click();
  await expect(menu).toHaveCount(0);
});

test('icon buttons are one step larger on a fine pointer', async ({ page }) => {
  await openKit(page);
  const box = await undo(page).boundingBox();
  // md: 36px base, 40px with a mouse.
  expect(box!.width).toBe(40);
  expect(box!.height).toBe(40);
});

test.describe('on touch', () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test('icon buttons are 44px targets on a coarse pointer', async ({
    page,
  }) => {
    await openKit(page);
    expect(
      await page.evaluate(() => matchMedia('(pointer: coarse)').matches),
    ).toBe(true);
    const box = await undo(page).boundingBox();
    expect(box!.width).toBe(44);
    expect(box!.height).toBe(44);
  });
});
