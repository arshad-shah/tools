import { expect, test } from '@playwright/test';
import { expectAxeClean, setTheme, stabilise, VIEWPORTS } from './helpers';

const SECTIONS = [
  'icons',
  'buttons',
  'inputs',
  'overlays',
  'navigation',
  'shell',
  'cards',
  'data',
  'diagram',
  'states',
  'media',
  'keys',
  'editor',
  'lists',
  'grid',
  'chart',
  'colour',
  'panes',
  'widgets',
  'form-fields',
  'annotate',
];

/** Phase-6 sections whose layout changes at phone width. */
const PHONE_SECTIONS = [
  'editor',
  'lists',
  'grid',
  'chart',
  'colour',
  'panes',
  'widgets',
];

for (const theme of ['light', 'dark'] as const) {
  test.describe(`kit gallery ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/__kit');
      await expect(
        page.getByRole('heading', { name: 'Kit gallery' }),
      ).toBeVisible();
      await setTheme(page, theme);
      await stabilise(page);
    });

    for (const section of SECTIONS) {
      test(section, async ({ page }) => {
        const el = page.getByTestId(`kit-section-${section}`);
        await expect(el).toHaveScreenshot(`${section}-${theme}.png`);
      });
    }

    for (const [name, button] of [
      ['dialog', 'Open dialog'],
      ['drawer', 'Open drawer'],
      ['focus-overlay', 'Open focus view'],
    ] as const) {
      test(name, async ({ page }) => {
        await page.getByRole('button', { name: button }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page).toHaveScreenshot(`${name}-${theme}.png`);
        await expectAxeClean(page);
      });
    }

    test('toasts', async ({ page }) => {
      await page.getByRole('button', { name: 'Show toasts' }).click();
      const toaster = page.locator('[data-sonner-toaster]');
      await expect(toaster.getByText('That file is not a PDF')).toBeVisible();
      await expect(toaster.locator('[data-sonner-toast]')).toHaveCount(3);
      // Hovering expands the stack so all three toasts are in the baseline.
      await toaster.locator('[data-sonner-toast]').first().hover();
      await expect(
        toaster.locator('[data-expanded="true"]').first(),
      ).toBeVisible();
      // sonner's list never settles as an element (it stacks and measures
      // its toasts), so the screenshot clips the page to the toasts' boxes.
      const boxes = await toaster
        .locator('[data-sonner-toast]')
        .evaluateAll((els) =>
          els.map((e) => e.getBoundingClientRect().toJSON()),
        );
      const x = Math.floor(Math.min(...boxes.map((b) => b.left))) - 8;
      const y = Math.floor(Math.min(...boxes.map((b) => b.top))) - 8;
      const right = Math.ceil(Math.max(...boxes.map((b) => b.right))) + 8;
      const bottom = Math.ceil(Math.max(...boxes.map((b) => b.bottom))) + 8;
      await expect(page).toHaveScreenshot(`toasts-${theme}.png`, {
        clip: { x, y, width: right - x, height: bottom - y },
      });
    });

    test('axe', async ({ page }) => expectAxeClean(page));
  });

  test.describe(`kit gallery phone ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.phone);
      await page.goto('/__kit');
      await expect(
        page.getByRole('heading', { name: 'Kit gallery' }),
      ).toBeVisible();
      await setTheme(page, theme);
      await stabilise(page);
    });

    for (const section of PHONE_SECTIONS) {
      test(section, async ({ page }) => {
        const el = page.getByTestId(`kit-section-${section}`);
        await expect(el).toHaveScreenshot(`${section}-phone-${theme}.png`);
      });
    }
  });
}
