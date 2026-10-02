import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';

const line = (page: Page, n: number) =>
  page.getByRole('textbox', { name: `Line ${n}`, exact: true });
const result = (page: Page, n: number) => page.getByTestId(`result-${n}`);

const open = async (page: Page) => {
  await page.goto(pathOf('calculator'));
  // The route is lazy: wait for its first compile (bounded by the test
  // timeout) before asserting with the shorter expect timeout.
  await line(page, 1).waitFor();
};

test.describe('Calculator & Grapher', () => {
  test('a sheet shares variables between lines', async ({ page }) => {
    await open(page);
    await line(page, 1).click();
    await page.keyboard.type('a = 5');
    await page.keyboard.press('Enter');
    await expect(line(page, 2)).toBeFocused();
    await page.keyboard.type('a * 2');
    await expect(result(page, 1)).toHaveText('5');
    await expect(result(page, 2)).toHaveText('10');
  });

  test('converts units on a line', async ({ page }) => {
    await open(page);
    await line(page, 1).fill('5 km to mi');
    await expect(result(page, 1)).toHaveText('3.1068559611867 mi');
  });

  test('page keys type into the sheet and Enter records history', async ({
    page,
  }) => {
    await open(page);
    await page.keyboard.type('12+3');
    await expect(line(page, 1)).toHaveValue('12+3');
    await expect(result(page, 1)).toHaveText('15');
    await page.keyboard.press('Enter');
    await expect(page.getByText('= 15', { exact: true })).toBeVisible();
    await page.keyboard.type('7*6');
    await expect(result(page, 2)).toHaveText('42');
    await page.keyboard.press('Escape');
    await expect(line(page, 2)).toHaveValue('');
  });

  test('programmer mode wraps 0xFF + 1 at 8 bits', async ({ page }) => {
    await open(page);
    await page.getByRole('radio', { name: 'Programmer' }).click();
    await page.getByRole('radio', { name: '8-bit' }).click();
    await page.getByRole('radio', { name: 'Unsigned' }).click();
    const expr = page.getByRole('textbox', { name: 'Expression' });
    await expr.fill('0xFF + 1');
    await expr.press('Enter');
    await expect(
      page.getByRole('textbox', { name: 'Decimal', exact: true }),
    ).toHaveValue('0');
    await expr.fill('0xFF');
    await expr.press('Enter');
    await expect(
      page.getByRole('textbox', { name: 'Binary', exact: true }),
    ).toHaveValue('1111 1111');
  });

  test('the grapher lists both roots of x^2 - 2', async ({ page }) => {
    await open(page);
    await page.getByRole('radio', { name: 'Grapher' }).click();
    await page.getByRole('textbox', { name: 'f1(x) =' }).fill('x^2 - 2');
    await expect(
      page.getByRole('img', { name: 'Graph of the functions' }),
    ).toBeVisible();
    const roots = page.getByRole('button', { name: /^f1 root at x = / });
    await expect(roots).toHaveCount(2);
    await expect(roots.first()).toHaveText('f1 root at x = -1.414213562');
    await expect(roots.last()).toHaveText('f1 root at x = 1.414213562');
  });

  test('a share link restores the sheet', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    await line(page, 1).click();
    await page.keyboard.type('w = 4');
    await page.keyboard.press('Enter');
    await page.keyboard.type('w ^ 2');
    await expect(result(page, 2)).toHaveText('16');
    await page.getByRole('button', { name: 'Share' }).click();
    await expect(page.getByText('Share link copied')).toBeVisible();
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toContain('#s=');

    const other = await context.newPage();
    await other.goto(url);
    await expect(line(other, 1)).toHaveValue('w = 4');
    await expect(line(other, 2)).toHaveValue('w ^ 2');
    await expect(result(other, 2)).toHaveText('16');
  });
});
