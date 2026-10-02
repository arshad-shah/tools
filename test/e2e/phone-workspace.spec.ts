import { expect, test, type Page } from '@playwright/test';

/*
 * Owner phone checks (390 px): the Pages drawer scrolls by touch and a tap
 * goes to the page; the bottom tool rows stay on one line and scroll.
 */
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const LARGE = 'test/fixtures/generated/text-300.pdf';

async function open(page: Page, file: string, path = '/pdf/edit') {
  await page.goto(path);
  await page.locator('input[type=file]').first().setInputFiles(file);
  await expect(
    page
      .locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]')
      .first(),
  ).toBeAttached({ timeout: 20_000 });
}

test('the Pages drawer scrolls by touch and a tap shows that page', async ({
  page,
}) => {
  await open(page, LARGE);
  await page.getByRole('button', { name: 'Pages', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Pages' });
  await expect(drawer).toBeVisible();
  const rail = drawer.getByRole('listbox', { name: 'Pages' });
  await expect(rail).toBeVisible();
  // The rail is its own scroller; the document behind does not scroll.
  const scroller = rail;
  const style = await scroller.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      overflowY: s.overflowY,
      overscroll: s.overscrollBehaviorY,
      scrollable: el.scrollHeight > el.clientHeight,
    };
  });
  expect(style.overflowY).toBe('auto');
  expect(style.overscroll).toBe('contain');
  expect(style.scrollable).toBe(true);
  // Touch-scroll down to page 30 (virtualised: it renders on the way).
  const target = drawer.locator('[data-rail-item]').filter({ hasText: /^30$/ });
  for (let i = 0; i < 40 && !(await target.count()); i++)
    await scroller.evaluate((el) => el.scrollBy(0, 400));
  await target.scrollIntoViewIfNeeded();
  const item = (await target.boundingBox())!;
  expect(item.height).toBeGreaterThanOrEqual(44);
  await target.tap();
  await expect(drawer).toBeHidden();
  await expect
    .poll(async () => {
      const slot = await page
        .locator('[data-testid="page-slot-30"]')
        .boundingBox();
      return !!slot && slot.y < 844 && slot.y + slot.height > 0;
    })
    .toBe(true);
});

test('the bottom tool rows never wrap: one row each that scrolls', async ({
  page,
}) => {
  await open(page, 'test/fixtures/generated/text-3.pdf', '/pdf/edit/fill-sign');
  const rows = [
    page.getByRole('toolbar', { name: /Fill & Sign/ }),
    page.getByRole('tablist', { name: 'Modes' }),
  ];
  for (const row of rows) {
    await expect(row).toBeVisible();
    const items = row.locator('button, [role="tab"]');
    const tops = await items.evaluateAll((els) => [
      ...new Set(
        els
          .filter((e) => (e as HTMLElement).offsetParent !== null)
          .map((e) => Math.round(e.getBoundingClientRect().top)),
      ),
    ]);
    expect(tops).toHaveLength(1);
    // The row itself, a descendant or the bar around it scrolls sideways.
    const scrolls = await row.evaluate((el) => {
      const up: HTMLElement[] = [];
      for (let n = el.parentElement; n && up.length < 3; n = n.parentElement)
        up.push(n);
      const all = [el, ...el.querySelectorAll('*'), ...up] as HTMLElement[];
      return all.some(
        (n) =>
          ['auto', 'scroll'].includes(getComputedStyle(n).overflowX) &&
          n.scrollWidth > n.clientWidth,
      );
    });
    expect(scrolls).toBe(true);
  }
});
