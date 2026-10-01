import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { pdfPageTexts } from '../fixtures/builders';

async function fill(page: Page) {
  await page.goto('/pdf-fill-form');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/form.pdf');
  await page.getByLabel('name', { exact: true }).fill('Ada Lovelace');
  await page.getByLabel('notes', { exact: true }).fill('Line one\nLine two');
  await page.getByRole('checkbox', { name: 'agree', exact: true }).click();
  await page.getByLabel('size', { exact: true }).selectOption('M');
  await page.getByLabel('country', { exact: true }).selectOption('France');
  await page.getByRole('checkbox', { name: 'toppings: Cheese' }).click();
  await page.getByRole('checkbox', { name: 'toppings: Olives' }).click();
  await expect(page.getByLabel('ref', { exact: true })).toBeDisabled();
}

async function download(page: Page) {
  await page.getByRole('button', { name: 'Fill & download' }).click();
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download form.filled.pdf' }).click();
  const d = await promise;
  expect(d.suggestedFilename()).toBe('form.filled.pdf');
  return new Uint8Array(readFileSync((await d.path())!));
}

test('fills every field kind', async ({ page }) => {
  await fill(page);
  const form = (await PDFDocument.load(await download(page))).getForm();
  expect(form.getTextField('name').getText()).toBe('Ada Lovelace');
  expect(form.getCheckBox('agree').isChecked()).toBe(true);
  expect(form.getRadioGroup('size').getSelected()).toBe('M');
  expect(form.getDropdown('country').getSelected()).toEqual(['France']);
  expect(form.getOptionList('toppings').getSelected()).toEqual([
    'Cheese',
    'Olives',
  ]);
});

test('flattens the filled form', async ({ page }) => {
  await fill(page);
  await page.getByRole('switch', { name: /Flatten form/ }).click();
  const bytes = await download(page);
  expect((await PDFDocument.load(bytes)).getForm().getFields()).toHaveLength(0);
  expect((await pdfPageTexts(bytes))[0]).toContain('Ada Lovelace');
});

test('explains that XFA forms are not supported', async ({ page }) => {
  await page.goto('/pdf-fill-form');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/xfa-form.pdf');
  await expect(
    page
      .getByRole('alert')
      .getByText('This PDF uses an XFA form, which is not supported.', {
        exact: false,
      }),
  ).toBeVisible();
});
