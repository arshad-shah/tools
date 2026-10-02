import { expect, test } from '@playwright/test';

/*
 * Navigation round trips (6-H): a tool keeps its inputs when you come back,
 * breadcrumbs are real links, Home has one search control, and the site
 * navigation reaches every category on desktop and phone.
 */

test('Home has exactly one search control', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /search/i })).toHaveCount(1);
});

test('Home to a tool and Back keeps the tool inputs', async ({ page }) => {
  await page.goto('/math/units');
  const field = page.getByLabel('Convert', { exact: true });
  await field.fill('5 ft to cm');
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.goto('/math/units');
  // A fresh page load starts clean: the inputs are never stored.
  await expect(page.getByLabel('Convert', { exact: true })).toHaveValue('');
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

test('desktop navigation lists categories and highlights the current tool', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/math/calculator');
  const nav = page.getByRole('navigation', { name: 'Tools navigation' });
  await expect(
    nav.getByRole('link', { name: 'Calculator & Grapher' }).first(),
  ).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Time' }).click();
  await expect(page).toHaveURL(/\/time$/);
  // It collapses and stays collapsed.
  await page.getByRole('button', { name: 'Navigation' }).click();
  await expect(nav).toHaveCount(0);
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 800 }, hasTouch: true });
  test('the menu sheet reaches Home and closes on navigation', async ({
    page,
  }) => {
    await page.goto('/math/calculator');
    await page.getByRole('button', { name: 'Menu' }).click();
    const sheet = page.getByRole('dialog', { name: 'Menu' });
    await sheet.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(sheet).toHaveCount(0);
  });
});
