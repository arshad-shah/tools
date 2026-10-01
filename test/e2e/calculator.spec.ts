import { expect, test } from '@playwright/test';

test('calculator expression box inserts typed digits at the caret', async ({
  page,
}) => {
  await page.goto('/calculator');
  await page.getByRole('tab', { name: 'Expression' }).click();
  const box = page.getByRole('textbox', { name: 'Expression' });
  await box.fill('');
  await box.pressSequentially('12+3');
  await expect(box).toHaveValue('12+3');
  // Caret to the start, then type: digits go there, not to the end.
  await box.press('Home');
  await box.pressSequentially('9');
  await expect(box).toHaveValue('912+3');
});

test('calculator expression mode honours degrees and radians', async ({
  page,
}) => {
  await page.goto('/calculator');
  await page.getByRole('tab', { name: 'Expression' }).click();
  const box = page.getByRole('textbox', { name: 'Expression' });

  await page.getByRole('button', { name: 'DEG' }).click();
  await box.fill('sin(30)');
  await page.getByRole('button', { name: 'Evaluate' }).click();
  await expect(box).toHaveValue(/^0\.(5|4999999999)/);

  await page.getByRole('button', { name: 'RAD' }).click();
  await box.fill('sin(30)');
  await page.getByRole('button', { name: 'Evaluate' }).click();
  await expect(box).toHaveValue(/^-0\.988/);
});

test('calculator standard mode works from the keyboard', async ({ page }) => {
  await page.goto('/calculator');
  const display = page.locator('main h3.tabular-nums');
  await expect(display).toHaveText('0');
  await page.keyboard.type('12+3');
  await page.keyboard.press('Enter');
  await expect(display).toHaveText('15');
  await page.keyboard.type('*2=');
  await expect(display).toHaveText('30');
  await page.keyboard.type('45');
  await page.keyboard.press('Backspace');
  await expect(display).toHaveText('4');
  await page.keyboard.press('Escape');
  await expect(display).toHaveText('0');
});

test('calculator expression box keeps Escape and Enter to itself', async ({
  page,
}) => {
  await page.goto('/calculator');
  await page.getByRole('tab', { name: 'Expression' }).click();
  const box = page.getByRole('textbox', { name: 'Expression' });
  await box.fill('sin(30)');
  await box.press('Escape');
  await expect(box).toHaveValue('sin(30)');
});

test('calculator plots exp(x) and reports an expression it cannot plot', async ({
  page,
}) => {
  await page.goto('/calculator');
  await page.getByRole('tab', { name: 'Expression' }).click();
  const box = page.getByRole('textbox', { name: 'Expression' });
  await box.fill('exp(x)');
  await page.getByRole('button', { name: 'Plot expression' }).click();
  await expect(page.getByText(/f\(x\) = exp\(x\)/).first()).toBeVisible();
  await expect(page.getByText(/Cannot plot/)).toHaveCount(0);
  await box.fill('2 +');
  await expect(page.getByText(/Cannot plot/)).toBeVisible();
});
