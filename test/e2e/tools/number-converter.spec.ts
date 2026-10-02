import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

const field = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('textbox', { name, exact: true });

test.describe('Number Base Converter', () => {
  test('64-bit unsigned hex keeps full precision', async ({ page }) => {
    await page.goto(pathOf('number-converter'));
    await expect(
      page.getByRole('heading', { level: 1, name: 'Number Base Converter' }),
    ).toBeVisible();
    await page.getByRole('radio', { name: '64-bit' }).click();
    await page.getByRole('radio', { name: 'Unsigned' }).click();
    await field(page, 'Hexadecimal').fill('FFFFFFFFFFFFFFFF');
    await expect(field(page, 'Decimal')).toHaveValue('18446744073709551615');
    await expect(field(page, 'Binary')).toHaveValue('1'.repeat(64));
  });

  test('invalid input clears the other fields', async ({ page }) => {
    await page.goto(pathOf('number-converter'));
    await field(page, 'Decimal').fill('42');
    await expect(field(page, 'Hexadecimal')).toHaveValue('2A');
    await field(page, 'Hexadecimal').fill('FG');
    await expect(
      page.getByText('Digit G is not valid in base 16 at position 2'),
    ).toBeVisible();
    await expect(field(page, 'Decimal')).toHaveValue('');
    await expect(field(page, 'Binary')).toHaveValue('');
    await expect(field(page, 'Octal')).toHaveValue('');
  });
});
