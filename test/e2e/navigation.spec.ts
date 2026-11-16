import { expect, test } from '@playwright/test';

/*
 * The redesigned shell (Cynosure AppShell): Home's live search, the Mod+K
 * palette, the navigation and its rail, breadcrumbs, the phone drawer and
 * tab bar, the colour mode, and tools kept alive across navigation.
 */

test('Home search filters the tool grid live', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Private tools that run in your browser',
  );
  const search = page.getByRole('searchbox', { name: 'Search tools' });
  await search.fill('jwt');
  const grid = page.getByRole('region', { name: 'Matching tools' });
  await expect(grid.getByRole('link', { name: /JWT Decoder/ })).toBeVisible();
  await expect(grid.getByRole('link', { name: /PDF Merger/ })).toHaveCount(0);
  await search.fill('zzqx');
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(search).toHaveValue('');
});

test('Mod+K opens the palette anywhere and runs a tool', async ({ page }) => {
  await page.goto('/math/units');
  await expect(page.getByLabel('Convert', { exact: true })).toBeVisible();
  await page.keyboard.press('ControlOrMeta+k');
  const palette = page.getByRole('dialog', {
    name: 'Search tools and actions',
  });
  await expect(palette).toBeVisible();
  await page.keyboard.type('jwt deco');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/encoding\/jwt$/);
  await expect(palette).toHaveCount(0);
});

test('Home to a tool and Back keeps the tool inputs', async ({ page }) => {
  await page.goto('/math/units');
  await page.getByLabel('Convert', { exact: true }).fill('5 ft to cm');
  // Client-side navigation away and Back: the tool is kept alive.
  await page.getByRole('link', { name: 'tools home' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/math\/units$/);
  await expect(page.getByLabel('Convert', { exact: true })).toHaveValue(
    '5 ft to cm',
  );
});

test('breadcrumb segments are links back up', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/math/calculator');
  const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
  await crumbs.getByRole('link', { name: 'Math' }).click();
  await expect(page).toHaveURL(/\/math$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Math');
});

test('the navigation marks the current tool, opens categories and collapses to a rail', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/math/calculator');
  const nav = page.getByRole('navigation', { name: 'Tools navigation' });
  await expect(
    nav
      .getByRole('link', { name: 'Calculator & Grapher' })
      .and(page.locator('[aria-current="page"]')),
  ).toHaveCount(1);
  await nav.getByRole('button', { name: 'Time' }).click();
  await nav.getByRole('link', { name: 'All Time tools' }).click();
  await expect(page).toHaveURL(/\/time$/);
  // The rail is a setting: it stays collapsed after a reload.
  await page.getByRole('button', { name: 'Collapse navigation' }).click();
  await page.reload();
  // AppShell's rail button is named for what it does next.
  await expect(
    page.getByRole('button', { name: 'Expand navigation' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Collapse navigation' }),
  ).toHaveCount(0);
});

test('a starred tool is listed under Favourites', async ({ page }) => {
  await page.goto('/encoding/jwt');
  await page
    .getByRole('button', { name: 'Add JWT Decoder to favourites' })
    .click();
  const nav = page.getByRole('navigation', { name: 'Tools navigation' });
  await expect(
    nav.getByRole('list', { name: 'Favourites' }).getByRole('link', {
      name: 'JWT Decoder',
    }),
  ).toBeVisible();
  await page.goto('/');
  await expect(
    page
      .getByRole('list', { name: 'Favourite tools' })
      .getByRole('link', { name: /JWT Decoder/ }),
  ).toBeVisible();
});

test('the colour mode is saved and applied before the first paint', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('button', { name: /Colour mode/ }).click();
  const saved = await page.evaluate(() => localStorage.getItem('tools:theme'));
  expect(saved).toMatch(/^(light|dark|system)$/);
  // The init script marks <html> before any module runs.
  await page.route('**/src/main.tsx', (route) => route.abort());
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-cy-mode', saved!);
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 800 }, hasTouch: true });
  test('the menu drawer reaches Home and closes on navigation', async ({
    page,
  }) => {
    await page.goto('/math/calculator');
    await page.getByRole('button', { name: 'Menu' }).click();
    const sheet = page.getByRole('dialog', { name: 'Menu' });
    await sheet.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(sheet).toBeHidden();
  });
  test('the tab bar opens search and the PDF hub', async ({ page }) => {
    await page.goto('/');
    const tabs = page.getByRole('navigation', { name: 'Sections' });
    await tabs.getByRole('button', { name: 'Search' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Search tools and actions' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await tabs.getByRole('link', { name: 'PDF' }).click();
    await expect(page).toHaveURL(/\/pdf$/);
  });
});
