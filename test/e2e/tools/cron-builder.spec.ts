import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

const expression = (page: import('@playwright/test').Page) =>
  page.getByRole('textbox', { name: 'Cron expression' });

test.describe('Cron Expression Builder', () => {
  test('a preset fills and explains the expression', async ({ page }) => {
    await page.goto(pathOf('cron-builder'));
    await expect(
      page.getByRole('heading', { level: 1, name: 'Cron Expression Builder' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Weekdays at 9' }).click();
    await expect(expression(page)).toHaveValue('0 9 * * 1-5');
    await expect(
      page.getByText('At 09:00 on every weekday from Monday to Friday'),
    ).toBeVisible();
  });

  test('an edited expression lists 10 next runs', async ({ page }) => {
    await page.goto(pathOf('cron-builder'));
    await expression(page).fill('32 9 * * *');
    const runs = page.getByRole('list', { name: 'Next runs' });
    await expect(runs.getByRole('listitem')).toHaveCount(10);
    await expect(runs.getByRole('listitem').first()).toContainText(':32:00');
  });

  test('an invalid field shows the error and its column', async ({ page }) => {
    await page.goto(pathOf('cron-builder'));
    await expression(page).fill('61 * * * *');
    await expect(
      page.getByText('Minute: 61 is out of range 0-59', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Column 1', { exact: true })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Next runs' })).toHaveCount(0);
  });

  test('a share link restores the expression', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(pathOf('cron-builder'));
    await expression(page).fill('15 10 * * 1');
    await page.getByRole('button', { name: 'Share' }).click();
    await expect(page.getByText('Share link copied')).toBeVisible();
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toContain('#s=');
    await page.goto('about:blank');
    await page.goto(url);
    await expect(expression(page)).toHaveValue('15 10 * * 1');
  });
});
