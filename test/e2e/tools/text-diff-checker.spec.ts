import { readFile } from 'node:fs/promises';
import { applyPatch } from 'diff';
import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';

const lines = (n: number, f: (i: number) => string = (i) => `line ${i}`) =>
  Array.from({ length: n }, (_, i) => f(i + 1)).join('\n');

async function fill(
  page: Page,
  side: 'Original text' | 'Changed text',
  text: string,
) {
  const box = page.getByRole('textbox', { name: side });
  await box.fill(text);
}

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
  await expect(
    page.getByRole('textbox', { name: 'Original text' }),
  ).toHaveValue('hello left');
});

test('text-diff-checker accepts a text/plain file of any extension', async ({
  page,
}) => {
  await page.goto(pathOf('text-diff-checker'));
  await page
    .locator('input[type=file]')
    .last()
    .setInputFiles({
      name: 'script.py',
      mimeType: 'text/plain',
      buffer: Buffer.from('print("right")'),
    });
  await expect(page.getByRole('textbox', { name: 'Changed text' })).toHaveValue(
    'print("right")',
  );
});

test('text-diff-checker collapses unchanged lines and navigates changes', async ({
  page,
}) => {
  await page.goto(pathOf('text-diff-checker'));
  await fill(page, 'Original text', lines(200));
  await fill(
    page,
    'Changed text',
    lines(200, (i) => (i === 100 || i === 150 ? `changed ${i}` : `line ${i}`)),
  );
  await expect(page.getByText('0 added, 0 removed, 2 changed')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Show 96 hidden lines/ }).first(),
  ).toBeVisible();
  await page.getByRole('heading').first().click();
  await page.keyboard.press('n');
  await expect(page.getByText('1 of 2')).toBeVisible();
  await page.keyboard.press('n');
  await expect(page.getByText('2 of 2')).toBeVisible();
  await page.keyboard.press('p');
  await expect(page.getByText('1 of 2')).toBeVisible();
});

test('text-diff-checker shows a JSON semantic table', async ({ page }) => {
  await page.goto(pathOf('text-diff-checker'));
  await fill(page, 'Original text', '{"a":1,"b":{"c":2}}');
  await fill(page, 'Changed text', '{"a":1,"b":{"c":3},"d":4}');
  await page.getByRole('radio', { name: 'JSON' }).click();
  const table = page.getByRole('table', { name: 'JSON differences' });
  await expect(table.getByRole('cell', { name: '$.b.c' })).toBeVisible();
  await expect(table.getByRole('cell', { name: '$.d' })).toBeVisible();
});

test('text-diff-checker merges a change from the right and downloads it', async ({
  page,
}) => {
  await page.goto(pathOf('text-diff-checker'));
  await fill(page, 'Original text', 'a\nb\nc\nd');
  await fill(page, 'Changed text', 'a\nB\nc\nD');
  await expect(page.getByText('0 added, 0 removed, 2 changed')).toBeVisible();
  await page.getByRole('button', { name: 'Merge changes' }).click();
  await page
    .getByRole('radiogroup', { name: 'Change 1 source' })
    .getByRole('radio', { name: 'Take right' })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Merged result' }),
  ).toHaveValue('a\nB\nc\nd');
  const download = page.waitForEvent('download');
  await page
    .getByRole('group', { name: 'Merged result' })
    .getByRole('button', { name: /Download/ })
    .click();
  const file = await (await download).path();
  expect(await readFile(file!, 'utf8')).toBe('a\nB\nc\nd');
});

test('text-diff-checker downloads a patch that applies', async ({ page }) => {
  const left = 'one\ntwo\nthree\n';
  const right = 'one\n2\nthree\nfour\n';
  await page.goto(pathOf('text-diff-checker'));
  await fill(page, 'Original text', left);
  await fill(page, 'Changed text', right);
  await expect(page.getByText('1 added, 0 removed, 1 changed')).toBeVisible();
  await page.getByRole('button', { name: 'Export' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Download .patch' }).click();
  const patch = await readFile((await (await download).path())!, 'utf8');
  expect(applyPatch(left, patch)).toBe(right);
});

test.skip('text-diff-checker takes a pair hand-off from the Code Formatter', () => {
  // The Code Formatter arrives with Part 6-D; the pair hand-off is covered
  // by the component test until then.
});
