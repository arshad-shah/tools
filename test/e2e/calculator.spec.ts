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
