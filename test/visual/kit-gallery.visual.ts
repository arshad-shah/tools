import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  expectAxeClean,
  keepTouch,
  setTheme,
  stabilise,
  VIEWPORTS,
} from './helpers';

/** One baseline per custom icon group (`src/shared/ui/icons/custom/<group>.tsx`). */
const ICON_GROUPS = [
  'annotate',
  'brand',
  'diagram',
  'edit',
  'fill-sign',
  'keys',
  'layout',
  'modes',
  'ocr',
  'optimize',
  'organize',
  'redact',
  'tools-p6',
];

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
  'workspace-bars',
  'page-overlays',
  'panels',
  'document',
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

    for (const group of ICON_GROUPS) {
      test(`icon group ${group}`, async ({ page }) => {
        const el = page.getByTestId(`kit-icon-group-${group}`);
        await expect(el).toHaveScreenshot(`icons-${group}-${theme}.png`);
      });
    }

    for (const [name, button] of [
      ['dialog', 'Open dialog'],
      ['drawer', 'Open drawer'],
      ['focus-overlay', 'Open focus view'],
    ] as const) {
      test(name, async ({ page }) => {
        // axe scans the whole gallery behind the modal, which takes a while.
        test.slow();
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

  // FIX-COLOUR: the picker inline, in its desktop popover and in the phone
  // sheet; the floating surfaces sit wholly inside the viewport.
  test.describe(`kit colour picker ${theme}`, () => {
    const inViewport = async (page: Page, name: string) => {
      const box = await page.getByRole('dialog', { name }).boundingBox();
      const vp = page.viewportSize();
      expect(box && vp).toBeTruthy();
      if (!box || !vp) return;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
      expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 1);
    };

    test('inline', async ({ page }) => {
      await page.goto('/__kit');
      await setTheme(page, theme);
      await stabilise(page);
      const picker = page.getByRole('group', { name: 'Accent colour' });
      await picker.scrollIntoViewIfNeeded();
      await expect(picker).toHaveScreenshot(`picker-inline-${theme}.png`);
    });

    test('popover', async ({ page }) => {
      await page.goto('/__kit');
      await setTheme(page, theme);
      await stabilise(page);
      const trigger = page.getByRole('button', { name: 'Choose Link colour' });
      // Room below the field for the whole picker.
      await trigger.evaluate((e) => e.scrollIntoView({ block: 'start' }));
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'Link colour' });
      await expect(dialog).toBeVisible();
      await inViewport(page, 'Link colour');
      await expect(dialog).toHaveScreenshot(`picker-popover-${theme}.png`);
      // Scoped to the picker: the page-wide gallery axe run covers the rest.
      const axe = await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .analyze();
      expect(
        axe.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => v.id),
      ).toEqual([]);
    });

    test('phone sheet', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.phone);
      await page.goto('/__kit');
      await setTheme(page, theme);
      await stabilise(page);
      await page.getByRole('button', { name: 'Choose Link colour' }).click();
      const sheet = page.getByRole('dialog', { name: 'Link colour' });
      await expect(sheet).toHaveAttribute('data-side', 'bottom');
      await inViewport(page, 'Link colour');
      await expect(page).toHaveScreenshot(`picker-sheet-phone-${theme}.png`);
    });
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

  // 6-H: bars of tools stay one row that scrolls on a 360 px touch screen.
  test.describe(`kit gallery 360 touch ${theme}`, () => {
    test.use({ viewport: { width: 360, height: 780 }, hasTouch: true });
    test('workspace bars', async ({ page }) => {
      await page.goto('/__kit');
      await expect(
        page.getByRole('heading', { name: 'Kit gallery' }),
      ).toBeVisible();
      await setTheme(page, theme);
      await stabilise(page);
      await keepTouch(page);
      const el = page.getByTestId('kit-section-workspace-bars');
      await expect(el).toHaveScreenshot(`workspace-bars-360-${theme}.png`);
    });
  });
}
