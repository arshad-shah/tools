import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PDFDocument, PDFName } from 'pdf-lib';

const FIXTURE = 'test/fixtures/generated/metadata.pdf';

test('edits the title and keeps XMP in sync', async ({ page }) => {
  await page.goto('/pdf-metadata');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  const title = page.getByLabel('Title', { exact: true });
  await expect(title).toHaveValue('Quarterly report');
  await expect(page.getByLabel('Author', { exact: true })).toHaveValue('Ada');
  await expect(page.getByText('XMP metadata present')).toBeVisible();
  await title.fill('Annual report');
  await page.getByRole('button', { name: 'Save metadata' }).click();
  const promise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download metadata.metadata.pdf' })
    .click();
  const d = await promise;
  expect(d.suggestedFilename()).toBe('metadata.metadata.pdf');
  const bytes = readFileSync((await d.path())!);
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  expect(doc.getTitle()).toBe('Annual report');
  expect(doc.getAuthor()).toBe('Ada');
  expect(bytes.toString('latin1')).toContain(
    '<rdf:li xml:lang="x-default">Annual report</rdf:li>',
  );
});

test('removes all metadata', async ({ page }) => {
  await page.goto('/pdf-metadata');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  await page.getByRole('button', { name: 'Remove all metadata' }).click();
  const promise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download metadata.no-metadata.pdf' })
    .click();
  const doc = await PDFDocument.load(
    readFileSync((await (await promise).path())!),
    { updateMetadata: false },
  );
  expect(doc.getTitle()).toBeUndefined();
  expect(doc.catalog.has(PDFName.of('Metadata'))).toBe(false);
});
