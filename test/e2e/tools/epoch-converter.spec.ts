import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

test.describe('Epoch & Time Zone Converter', () => {
  test('detects Unix milliseconds and shows the ISO output', async ({
    page,
  }) => {
    await page.goto(pathOf('epoch-converter'));
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Epoch & Time Zone Converter',
      }),
    ).toBeVisible();
    await page.getByLabel('Timestamp or date').fill('1700000000000');
    await expect(page.getByText('Detected: Unix milliseconds')).toBeVisible();
    const table = page.getByRole('table', { name: 'Conversions' });
    await expect(table.getByText('2023-11-14T22:13:20.000Z')).toBeVisible();
    await expect(
      table.getByText('Tue, 14 Nov 2023 22:13:20 +0000'),
    ).toBeVisible();
  });

  test('an override reads the number in another unit', async ({ page }) => {
    await page.goto(pathOf('epoch-converter'));
    await page.getByLabel('Timestamp or date').fill('1700000000');
    await expect(page.getByText('Detected: Unix seconds')).toBeVisible();
    await page.getByLabel('Read numbers as').selectOption('unix-ms');
    await expect(page.getByText('Detected: Unix milliseconds')).toBeVisible();
    await expect(
      page
        .getByRole('table', { name: 'Conversions' })
        .getByText('1970-01-20T16:13:20.000Z'),
    ).toBeVisible();
  });

  test('invalid input shows an error and no stale results', async ({
    page,
  }) => {
    await page.goto(pathOf('epoch-converter'));
    await page.getByLabel('Timestamp or date').fill('1700000000000');
    await expect(
      page.getByRole('table', { name: 'Conversions' }),
    ).toBeVisible();
    await page.getByLabel('Timestamp or date').fill('not a date');
    await expect(page.getByText(/Could not read "not a date"/)).toBeVisible();
    await expect(page.getByRole('table', { name: 'Conversions' })).toHaveCount(
      0,
    );
  });

  test('the live clock pauses', async ({ page }) => {
    await page.goto(pathOf('epoch-converter'));
    await page.getByRole('button', { name: 'Pause' }).click();
    const cell = page
      .getByRole('table', { name: 'Current time' })
      .getByRole('row', { name: /Unix milliseconds/ });
    const first = await cell.textContent();
    await page.waitForTimeout(1200);
    expect(await cell.textContent()).toBe(first);
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  });
});

test.describe('Epoch zones', () => {
  test('adds a zone by city and plans a meeting with shading', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        'kit:store:tool:epoch-converter',
        JSON.stringify({
          version: 1,
          state: { zones: ['America/New_York'], workHours: [9, 17] },
        }),
      ),
    );
    await page.goto(pathOf('epoch-converter'));
    await page.getByRole('tab', { name: 'World clock' }).click();
    await page.getByLabel('Add a zone or city').fill('Dublin');
    await page.getByRole('button', { name: /Europe\/Dublin/ }).click();
    await expect(
      page.getByRole('table', { name: 'World clock' }).getByRole('row', {
        name: 'Europe/Dublin',
      }),
    ).toBeVisible();

    await page.getByRole('tab', { name: 'Meeting planner' }).click();
    await page.getByLabel('Day (UTC)').fill('2024-06-03');
    await expect(
      page.getByText('Best overlap (UTC): 13:00, 14:00, 15:00'),
    ).toBeVisible();
    const planner = page.getByTestId('meeting-planner');
    await expect(planner.locator('td[data-working]')).toHaveCount(16);
    await expect(planner.locator('td[data-best]')).toHaveCount(6);
  });

  test('the zone converter explains a skipped DST time', async ({ page }) => {
    await page.goto(pathOf('epoch-converter'));
    await page.getByRole('tab', { name: 'World clock' }).click();
    await page.getByLabel('Date', { exact: true }).fill('2024-03-31');
    await page.getByLabel('Time', { exact: true }).fill('01:30');
    await page.getByLabel('In zone').selectOption('Europe/Dublin');
    await expect(
      page.getByText(/01:30 does not exist in Europe\/Dublin/),
    ).toBeVisible();
  });
});

test('a share link restores the instant and zones', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(pathOf('epoch-converter'));
  await page.getByLabel('Timestamp or date').fill('1700000000000');
  await page.getByRole('button', { name: 'Share' }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  await page.goto('about:blank');
  await page.goto(url);
  await expect(page.getByLabel('Timestamp or date')).toHaveValue(
    '1700000000000',
  );
  await expect(
    page
      .getByRole('table', { name: 'Conversions' })
      .getByText('2023-11-14T22:13:20.000Z'),
  ).toBeVisible();
});
