import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * Floating surfaces never clip (owner feedback): Cynosure flips and shifts
 * them to stay inside the viewport and shows them in the top layer, out of
 * reach of clipping ancestors. Checked on Home: a tool card's favourite
 * star (an IconButton with its tooltip) and the Help menu in the navigation.
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

async function openHome(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/** The Text category's section on Home, and its first tool's star. */
const textSection = (page: Page) => page.locator('#category-text');
const star = (page: Page) =>
  textSection(page)
    .getByRole('button', { name: /^Add .+ to favourites$/ })
    .first();
const bubble = (page: Page) => page.getByRole('tooltip');

async function hoverAtCorners(page: Page) {
  const button = star(page);
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
    const tip = (await bubble(page).boundingBox())!;
    const trigger = (await button.boundingBox())!;
    if (corner.startsWith('top'))
      expect(tip.y).toBeGreaterThanOrEqual(trigger.y + trigger.height);
    else expect(tip.y + tip.height).toBeLessThanOrEqual(trigger.y);
    // Still beside the trigger after it slid along the edge.
    expect(tip.x).toBeLessThanOrEqual(trigger.x + trigger.width);
    expect(tip.x + tip.width).toBeGreaterThanOrEqual(trigger.x);
  }
}

test('icon button tooltips stay inside the viewport at all four edges', async ({
  page,
}) => {
  await openHome(page);
  await hoverAtCorners(page);
});

test('the same holds in a right-to-left document', async ({ page }) => {
  await openHome(page);
  await page.evaluate(() =>
    document.documentElement.setAttribute('dir', 'rtl'),
  );
  await hoverAtCorners(page);
});

test('a tooltip escapes a clipping, transformed scroll container', async ({
  page,
}) => {
  await openHome(page);
  const section = textSection(page);
  await section.evaluate((s) => {
    Object.assign((s as HTMLElement).style, {
      overflow: 'auto',
      maxHeight: '160px',
      transform: 'translateZ(0)',
    });
  });
  const button = star(page);
  await button.scrollIntoViewIfNeeded();
  await button.hover();
  await expect(bubble(page)).toBeVisible();
  // In the top layer: no ancestor's overflow can cut it.
  expect(await bubble(page).evaluate((b) => b.matches(':popover-open'))).toBe(
    true,
  );
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
  await openHome(page);
  const trigger = page.getByRole('button', { name: 'Help' });
  // The Menu root is the trigger's parent.
  await pin(trigger.locator('xpath=..'), 'bottom-right');
  await trigger.click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expectInsideViewport(page, menu);
  // Flipped above the trigger.
  const box = (await menu.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(
    (await trigger.boundingBox())!.y,
  );
  await page.getByRole('menuitem', { name: 'Keyboard shortcuts' }).click();
  await expect(menu).toHaveCount(0);
});

/**
 * A button's target: its box, grown by Cynosure's ::before hit area (which
 * keeps small buttons small and their targets large).
 */
async function target(button: Locator) {
  return button.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = getComputedStyle(el, '::before');
    return {
      width: Math.max(r.width, parseFloat(hit.width) || 0),
      height: Math.max(r.height, parseFloat(hit.height) || 0),
    };
  });
}

// Cynosure's IconButton: a small button whose hit area is at least 24px
// with a mouse and 44px on touch.
test('icon buttons are at least 24px targets on a fine pointer', async ({
  page,
}) => {
  await openHome(page);
  const box = await target(star(page));
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(24);
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
    await openHome(page);
    expect(
      await page.evaluate(() => matchMedia('(pointer: coarse)').matches),
    ).toBe(true);
    const box = await target(star(page));
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    // The target really takes the tap: a point just inside its edge.
    await star(page).scrollIntoViewIfNeeded();
    const r = (await star(page).boundingBox())!;
    const hitsButton = await page.evaluate(
      ({ x, y }) =>
        !!document
          .elementFromPoint(x, y)
          ?.closest('button[aria-label$="to favourites"]'),
      { x: r.x + r.width / 2, y: r.y + r.height / 2 - 21 },
    );
    expect(hitsButton).toBe(true);
  });
});
