import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * Owner feedback on the Fill & Sign text settings (FIX-TEXTBAR): the bar
 * never covers the box being typed in and stays inside the viewport (and
 * above the on-screen keyboard on a phone); the box itself is transparent
 * with the text in place.
 */
const TEXT = 'test/fixtures/generated/text-3.pdf';
const FLAT = 'test/fixtures/generated/flat-form-word.pdf';

type Box = { x: number; y: number; width: number; height: number };

const intersects = (a: Box, b: Box) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

async function rect(l: Locator): Promise<Box> {
  const r = await l.boundingBox();
  expect(r).not.toBeNull();
  return r!;
}

/** The bar's box is inside the viewport (and above `bottom`, e.g. a keyboard). */
async function expectInside(page: Page, bar: Box, bottom?: number) {
  const vp = page.viewportSize()!;
  expect(bar.x).toBeGreaterThanOrEqual(0);
  expect(bar.y).toBeGreaterThanOrEqual(0);
  expect(bar.x + bar.width).toBeLessThanOrEqual(vp.width + 0.5);
  expect(bar.y + bar.height).toBeLessThanOrEqual((bottom ?? vp.height) + 0.5);
}

/** A fake on-screen keyboard: visualViewport shrinks by window.__kb px. */
async function mockKeyboard(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __kb: number };
    w.__kb = 0;
    const vv = new EventTarget();
    Object.defineProperties(vv, {
      height: { get: () => window.innerHeight - w.__kb },
      width: { get: () => window.innerWidth },
      offsetTop: { get: () => 0 },
      offsetLeft: { get: () => 0 },
      pageTop: { get: () => window.scrollY },
      pageLeft: { get: () => window.scrollX },
      scale: { get: () => 1 },
    });
    window.addEventListener('resize', () =>
      vv.dispatchEvent(new Event('resize')),
    );
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      get: () => vv,
    });
  });
}

async function setKeyboard(page: Page, px: number) {
  await page.evaluate((h) => {
    (window as unknown as { __kb: number }).__kb = h;
    window.visualViewport!.dispatchEvent(new Event('resize'));
  }, px);
}

async function open(page: Page, file = TEXT) {
  await page.goto('/pdf/edit/fill-sign');
  await page.locator('input[type=file]').first().setInputFiles(file);
  await expect(
    page
      .locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]')
      .first(),
  ).toBeAttached({ timeout: 15_000 });
}

/** Text tool, then a click on page 1 at a fraction of its slot. */
async function placeText(page: Page, fx: number, fy: number) {
  await page
    .getByRole('toolbar', { name: /Fill & Sign/ })
    .getByRole('button', { name: 'Text', exact: true })
    .click();
  const slot = await rect(page.locator('[data-testid="page-slot-1"]'));
  await page.mouse.click(slot.x + slot.width * fx, slot.y + slot.height * fy);
  const input = page.locator('[data-state="focused"] input');
  await expect(input).toBeFocused();
  return input;
}

const bar = (page: Page) =>
  page.getByRole('toolbar', { name: 'Text settings' });
const active = (page: Page) => page.locator('[data-state="focused"]');

test.describe('desktop 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('a slim bar above the box, never over it, inside the viewport', async ({
    page,
  }) => {
    await open(page);
    const input = await placeText(page, 0.3, 0.4);
    await input.fill('Hello there');
    const b = await rect(bar(page));
    const box = await rect(active(page));
    expect(b.height).toBeLessThanOrEqual(48);
    expect(intersects(b, box)).toBe(false);
    expect(b.y + b.height).toBeLessThanOrEqual(box.y);
    await expectInside(page, b);
    // Steppers fit three digits and a decimal without truncating.
    const size = bar(page).getByRole('spinbutton', {
      name: 'Text size in points',
    });
    await bar(page).getByRole('button', { name: 'Larger text' }).click();
    await expect(size).toHaveValue('11.5');
    const field = await size.evaluate((el: HTMLInputElement) => ({
      scroll: el.scrollWidth,
      client: el.clientWidth,
    }));
    expect(field.scroll).toBeLessThanOrEqual(field.client);
    // Bigger text never pushes the bar onto the box.
    await bar(page).getByRole('button', { name: 'Larger text' }).click();
    expect(intersects(await rect(bar(page)), await rect(active(page)))).toBe(
      false,
    );
  });

  test('the active box is transparent: the page shows through', async ({
    page,
  }) => {
    await open(page);
    const input = await placeText(page, 0.3, 0.4);
    await input.fill('In place');
    const look = await active(page).evaluate((el) => {
      const i = el.querySelector('input')!;
      return {
        box: getComputedStyle(el).backgroundColor,
        input: getComputedStyle(i).backgroundColor,
        text: getComputedStyle(i).color,
      };
    });
    expect(look.box).toBe('rgba(0, 0, 0, 0)');
    expect(look.input).toBe('rgba(0, 0, 0, 0)');
    expect(look.text).toBe('rgba(0, 0, 0, 0)');
    // The text is drawn on the page where the export puts it.
    const drawn = page.getByTestId('value-draft');
    await expect(drawn).toHaveText('In place');
    // At the box, not below it.
    const at = await rect(drawn);
    const box = await rect(active(page));
    expect(Math.abs(at.y - box.y)).toBeLessThan(2);
  });

  test('a box near the right edge stays on the page', async ({ page }) => {
    await open(page);
    await placeText(page, 0.97, 0.4);
    const slot = await rect(page.locator('[data-testid="page-slot-1"]'));
    const box = await rect(active(page));
    expect(box.x + box.width).toBeLessThanOrEqual(slot.x + slot.width + 1);
  });

  test('Esc closes the bar and keeps the text; Done finishes', async ({
    page,
  }) => {
    await open(page);
    const input = await placeText(page, 0.3, 0.4);
    await input.fill('Kept');
    await bar(page).getByRole('button', { name: 'Larger text' }).focus();
    await page.keyboard.press('Escape');
    await expect(bar(page)).toHaveCount(0);
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('Kept');
    // Esc in a new box keeps its text too.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(/^value-free:/)).toHaveCount(1);
    // Done finishes with a selected box.
    await expect(bar(page)).toBeVisible();
    await bar(page).getByRole('button', { name: 'Done' }).click();
    await expect(bar(page)).toHaveCount(0);
    await expect(page.getByTestId(/^value-free:/)).toHaveCount(1);
  });

  test('Tab moves to the next field and the bar follows it', async ({
    page,
  }) => {
    await open(page, FLAT);
    await page
      .getByRole('button', { name: 'Text field: Surname, empty' })
      .first()
      .click();
    const surname = page.getByRole('textbox', { name: 'Surname' });
    await expect(surname).toBeFocused();
    await expect(bar(page)).toBeVisible();
    await surname.fill('Doe');
    await surname.press('Tab');
    await expect(surname).toHaveCount(0);
    const next = page.locator('[data-state="focused"] input');
    await expect(next).toBeFocused();
    const b = await rect(bar(page));
    expect(intersects(b, await rect(active(page)))).toBe(false);
    await expectInside(page, b);
  });
});

test.describe('phone 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('one row docked at the bottom, above the keyboard, never over the box', async ({
    page,
  }) => {
    await mockKeyboard(page);
    await open(page);
    const input = await placeText(page, 0.4, 0.75);
    await input.fill('20261002');
    const docked = bar(page);
    let b = await rect(docked);
    expect(b.height).toBeLessThanOrEqual(72);
    expect(Math.round(b.y + b.height)).toBe(844);
    expect(intersects(b, await rect(active(page)))).toBe(false);
    await expectInside(page, b);
    // Every control shares one row.
    const tops = await docked
      .getByRole('button')
      .evaluateAll((els) => [
        ...new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))),
      ]);
    expect(tops).toHaveLength(1);

    // The keyboard opens: the bar rides above it and the box scrolls clear.
    await setKeyboard(page, 320);
    await expect
      .poll(async () =>
        Math.round((await rect(docked)).y + (await rect(docked)).height),
      )
      .toBe(844 - 320);
    await expect
      .poll(async () => {
        const box = await rect(active(page));
        const now = await rect(docked);
        return box.y + box.height <= now.y && box.y >= 0;
      })
      .toBe(true);
    b = await rect(docked);
    expect(intersects(b, await rect(active(page)))).toBe(false);
    await expectInside(page, b, 844 - 320);
  });

  test('More opens every setting in a bottom sheet', async ({ page }) => {
    await open(page);
    await placeText(page, 0.4, 0.4);
    await bar(page).getByRole('button', { name: 'More text settings' }).click();
    const sheet = page.getByRole('dialog', { name: 'Text settings' });
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole('combobox', { name: 'Text size presets' }),
    ).toBeVisible();
    await expect(
      sheet.getByRole('slider', { name: 'Letter spacing' }),
    ).toBeVisible();
    await expect(
      sheet.getByRole('switch', { name: 'Character boxes' }),
    ).toBeVisible();
  });
});
