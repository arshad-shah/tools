import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

type Page = import('@playwright/test').Page;
/** The time input (a TextField; getByLabel also finds its error). */
const timeInput = (page: Page) =>
  page.getByRole('textbox', { name: 'Timestamp or date' });

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
    await timeInput(page).fill('1700000000000');
    await expect(page.getByText('Detected: Unix milliseconds')).toBeVisible();
    const table = page.getByRole('table', { name: 'Conversions' });
    await expect(table.getByText('2023-11-14T22:13:20.000Z')).toBeVisible();
    await expect(
      table.getByText('Tue, 14 Nov 2023 22:13:20 +0000'),
    ).toBeVisible();
  });

  test('an override reads the number in another unit', async ({ page }) => {
    await page.goto(pathOf('epoch-converter'));
    await timeInput(page).fill('1700000000');
    await expect(page.getByText('Detected: Unix seconds')).toBeVisible();
    await page.getByRole('combobox', { name: 'Read numbers as' }).click();
    await page.getByRole('option', { name: 'Unix milliseconds' }).click();
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
    await timeInput(page).fill('1700000000000');
    await expect(
      page.getByRole('table', { name: 'Conversions' }),
    ).toBeVisible();
    await timeInput(page).fill('not a date');
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
    await page.getByRole('radio', { name: 'World clock' }).click();
    await page
      .getByRole('searchbox', { name: 'Add a zone or city' })
      .fill('Dublin');
    await page.getByRole('button', { name: /Europe\/Dublin/ }).click();
    const clock = page.getByRole('list', { name: 'World clock' });
    await expect(
      clock.getByText('Europe/Dublin', { exact: true }),
    ).toBeVisible();
    await expect(
      clock.getByRole('button', { name: 'Remove Europe/Dublin' }),
    ).toBeVisible();

    await page.getByRole('radio', { name: 'Meeting planner' }).click();
    const day = page.getByRole('textbox', { name: 'Day (UTC)' });
    await day.fill('2024-06-03');
    await day.press('Enter');
    await expect(
      page.getByText('Best overlap (UTC): 13:00, 14:00, 15:00'),
    ).toBeVisible();
    const planner = page.getByRole('table', { name: 'Meeting planner' });
    // 8 working hours in each of the two zones.
    await expect(planner.getByText('working')).toHaveCount(16);
  });

  test('the zone converter explains a skipped DST time', async ({ page }) => {
    await page.goto(pathOf('epoch-converter'));
    await page.getByRole('radio', { name: 'World clock' }).click();
    const date = page.getByRole('textbox', { name: 'Date', exact: true });
    await date.fill('2024-03-31');
    await date.press('Enter');
    const time = page.getByRole('textbox', { name: 'Time', exact: true });
    await time.fill('01:30');
    await time.press('Enter');
    await page.getByRole('combobox', { name: 'In zone' }).click();
    await page.getByRole('option', { name: /^Europe\/Dublin/ }).click();
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
  await timeInput(page).fill('1700000000000');
  await page.getByRole('button', { name: 'Share' }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  await page.goto('about:blank');
  await page.goto(url);
  await expect(timeInput(page)).toHaveValue('1700000000000');
  await expect(
    page
      .getByRole('table', { name: 'Conversions' })
      .getByText('2023-11-14T22:13:20.000Z'),
  ).toBeVisible();
});
