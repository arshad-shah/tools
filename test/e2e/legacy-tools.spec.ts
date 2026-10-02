import { expect, test } from '@playwright/test';
import { pathOf } from './tool-routes';

test('text-diff-checker loads a file into the left pane', async ({ page }) => {
  await page.goto(pathOf('text-diff-checker'));
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'left.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello left'),
    });
  await expect(page.getByText('left.txt loaded successfully')).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Original text' }),
  ).toHaveValue('hello left');
});

test('calculator plots an expression without crashing', async ({ page }) => {
  await page.goto(pathOf('calculator'));
  await page.getByRole('radio', { name: 'Grapher' }).click();
  await page.getByRole('textbox', { name: 'f1(x) =' }).fill('sin(x)');
  await expect(
    page.getByRole('img', { name: 'Graph of the functions' }),
  ).toBeVisible();
  await expect(page.getByText('Calculator encountered an error')).toHaveCount(
    0,
  );
});
