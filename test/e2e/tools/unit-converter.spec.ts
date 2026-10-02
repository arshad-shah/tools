import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

test.describe('Unit Converter', () => {
  test.use({ locale: 'en-US' });

  test('editing any unit updates all the others', async ({ page }) => {
    await page.goto(pathOf('unit-converter'));
    await page
      .getByRole('textbox', { name: 'Kilometres', exact: true })
      .fill('5');
    await expect(
      page.getByRole('textbox', { name: 'Miles', exact: true }),
    ).toHaveValue('3.106855961');
    await page.getByRole('textbox', { name: 'Feet', exact: true }).fill('3');
    await expect(
      page.getByRole('textbox', { name: 'Inches', exact: true }),
    ).toHaveValue('36');
  });

  test('free text 72F jumps to temperature', async ({ page }) => {
    await page.goto(pathOf('unit-converter'));
    await page
      .getByRole('textbox', { name: 'Convert', exact: true })
      .fill('72F');
    await expect(
      page.getByRole('textbox', { name: 'Celsius', exact: true }),
    ).toHaveValue('22.22222222');
  });

  test('an electronvolt in joules is not rounded to 0', async ({ page }) => {
    await page.goto(pathOf('unit-converter'));
    await page
      .getByRole('combobox', { name: 'Category' })
      .selectOption('energy');
    await page
      .getByRole('textbox', { name: 'Electronvolts', exact: true })
      .fill('1');
    await expect(
      page.getByRole('textbox', { name: 'Joules', exact: true }),
    ).toHaveValue('1.602176634e-19');
  });

  test('a settled conversion lands in Recent and survives a reload', async ({
    page,
  }) => {
    await page.goto(pathOf('unit-converter'));
    await page.getByRole('textbox', { name: 'Metres', exact: true }).fill('42');
    await expect(page.getByRole('button', { name: /^42 m = / })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: /^42 m = / })).toBeVisible();
  });
});

test('a share link restores the category, value and unit', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(pathOf('unit-converter'));
  await page.getByRole('combobox', { name: 'Category' }).selectOption('mass');
  await page.getByRole('textbox', { name: 'Pounds', exact: true }).fill('3');
  await page.getByRole('button', { name: 'Share' }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('#s=');
  await page.goto('about:blank');
  await page.goto(url);
  await expect(
    page.getByRole('textbox', { name: 'Pounds', exact: true }),
  ).toHaveValue('3');
  await expect(
    page.getByRole('textbox', { name: 'Kilograms', exact: true }),
  ).toHaveValue('1.36077711');
});
