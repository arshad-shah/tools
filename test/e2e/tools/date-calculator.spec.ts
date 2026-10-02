import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

test.describe('Date & Time Calculator', () => {
  test.use({ timezoneId: 'Europe/Dublin', locale: 'en-GB' });

  test('shows a calendar difference live', async ({ page }) => {
    await page.goto(pathOf('date-calculator'));
    await page.getByLabel('Start', { exact: true }).fill('2023-01-15');
    await page.getByLabel('End', { exact: true }).fill('2024-02-19');
    await expect(
      page.getByRole('heading', { name: '1 year, 1 month and 4 days' }),
    ).toBeVisible();
  });

  test('Jan 31 plus 1 month clamps to the end of February', async ({
    page,
  }) => {
    await page.goto(pathOf('date-calculator'));
    await page.getByRole('tab', { name: 'Add or subtract' }).click();
    await page.getByLabel('Start from', { exact: true }).fill('2024-01-31');
    await expect(
      page.getByRole('heading', { name: /^2024-02-29T00:00:00/ }),
    ).toBeVisible();
    await page.getByRole('radio', { name: 'Roll into next month' }).click();
    await expect(
      page.getByRole('heading', { name: /^2024-03-02T00:00:00/ }),
    ).toBeVisible();
  });

  test('counts business days with a pasted holiday', async ({ page }) => {
    await page.goto(pathOf('date-calculator'));
    await page.getByRole('tab', { name: 'Business days' }).click();
    await page.getByLabel('From', { exact: true }).fill('2024-06-03');
    await page
      .getByLabel('Until (not counted)', { exact: true })
      .fill('2024-06-10');
    await expect(
      page.getByRole('heading', { name: '5 business days' }),
    ).toBeVisible();
    await page.getByLabel('Holidays (one date per line)').fill('2024-06-05');
    await expect(
      page.getByRole('heading', { name: '4 business days' }),
    ).toBeVisible();
  });

  test('a zone change moves the instant', async ({ page }) => {
    await page.goto(pathOf('date-calculator'));
    await page.getByLabel('Start', { exact: true }).fill('2024-06-01T12:00');
    await page.getByLabel('End', { exact: true }).fill('2024-06-01T12:00');
    await expect(
      page.getByRole('heading', { name: 'No difference' }),
    ).toBeVisible();
    await page.getByLabel('End time zone').selectOption('America/New_York');
    await expect(page.getByRole('heading', { name: '5 hours' })).toBeVisible();
  });

  test('Compare across zones opens the epoch converter with the instant', async ({
    page,
  }) => {
    await page.goto(pathOf('date-calculator'));
    await page.getByRole('tab', { name: 'Add or subtract' }).click();
    await page
      .getByLabel('Start from', { exact: true })
      .fill('2023-11-14T22:13:20Z');
    await page.getByLabel('Step 1 amount').fill('0');
    await page.getByRole('button', { name: 'Compare across zones' }).click();
    await expect(page.getByLabel('Timestamp or date')).toHaveValue(
      '1700000000',
    );
    await expect(page.getByText('Detected: Unix seconds')).toBeVisible();
  });
});

test('a share link restores the tab, inputs and holidays', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(pathOf('date-calculator'));
  await page.getByRole('tab', { name: 'Business days' }).click();
  await page.getByLabel('From', { exact: true }).fill('2024-06-03');
  await page
    .getByLabel('Until (not counted)', { exact: true })
    .fill('2024-06-10');
  await page.getByLabel('Holidays (one date per line)').fill('2024-06-05');
  await page.getByRole('button', { name: 'Share' }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  await page.goto('about:blank');
  await page.goto(url);
  await expect(
    page.getByRole('heading', { name: '4 business days' }),
  ).toBeVisible();
});
