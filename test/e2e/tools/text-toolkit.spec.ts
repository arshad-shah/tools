import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';

const editor = (page: Page) =>
  page.getByRole('textbox', { name: 'Text', exact: true });

test('text-toolkit sorts lines and Mod+Z restores them', async ({ page }) => {
  await page.goto(pathOf('text-toolkit'));
  await editor(page).fill('pear\napple\nfig');
  await page.getByRole('button', { name: 'Sort A to Z' }).click();
  await expect(editor(page)).toHaveValue('apple\nfig\npear');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor(page)).toHaveValue('pear\napple\nfig');
});

test('text-toolkit replaces with a regex and groups', async ({ page }) => {
  await page.goto(pathOf('text-toolkit'));
  await editor(page).fill('me@x you@y');
  await page.getByLabel('Find', { exact: true }).fill('(\\w+)@');
  await page.getByRole('switch', { name: 'Regular expression' }).click();
  await page.getByLabel('Replace with', { exact: true }).fill('[$1]');
  await expect(page.getByText('2 matches')).toBeVisible();
  await page.getByRole('button', { name: 'Replace all' }).click();
  await expect(editor(page)).toHaveValue('[me]x [you]y');
});

test('text-toolkit survives catastrophic backtracking', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto(pathOf('text-toolkit'));
  await editor(page).fill('a'.repeat(40) + 'b');
  await page.getByLabel('Find', { exact: true }).fill('(a+)+$');
  await page.getByRole('switch', { name: 'Regular expression' }).click();
  await page.getByRole('button', { name: 'Replace all' }).click();
  await expect(page.getByText(/Pattern took too long/).first()).toBeVisible({
    timeout: 5000,
  });
  // The tab stays responsive.
  await page.getByRole('button', { name: 'Upper case' }).click();
  await expect(editor(page)).toHaveValue('A'.repeat(40) + 'B');
});

test('text-toolkit counts words live', async ({ page }) => {
  await page.goto(pathOf('text-toolkit'));
  await editor(page).fill('one two three');
  await expect(page.getByText('3 words', { exact: true })).toBeVisible();
});
