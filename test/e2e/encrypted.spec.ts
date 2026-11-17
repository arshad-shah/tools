import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { pathOf } from './tool-routes';

const FILE = 'test/fixtures/generated/encrypted-aes.pdf';
const OWNER_ONLY = 'test/fixtures/generated/encrypted-owner-only.pdf';
const TOOLS = [
  'pdf-merger',
  'pdf-splitter',
  'pdf-to-images',
  'pdf-to-text',
  'pdf-compressor',
  'pdf-protect',
];

/** Proof that the tool really worked on the decrypted bytes. */
const PROCESSED: Record<string, (page: Page) => Promise<void>> = {};
const rendered = (page: Page) =>
  expect(
    page
      .locator(
        'canvas[data-rendered="true"], img[alt="Page 1"], img[alt$=", page 1"]',
      )
      .first(),
  ).toBeAttached();
// Protect and Compress show no pages: the opened document's page count is
// the proof.
PROCESSED['pdf-protect'] = PROCESSED['pdf-compressor'] = (page) =>
  expect(page.getByText(/^\d+ pages?,/)).toBeVisible();

for (const id of TOOLS) {
  test(`${id} asks for the password of an AES-256 PDF and opens it`, async ({
    page,
  }) => {
    await page.goto(pathOf(id));
    await page.locator('input[type=file]').first().setInputFiles(FILE);
    const password = page.getByLabel('Password for encrypted-aes.pdf', {
      exact: true,
    });
    await password.fill('wrong');
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();
    await expect(
      page.getByText('That password is not correct. Try again.'),
    ).toBeVisible();
    await password.fill('user-pw');
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();
    await expect(password).toHaveCount(0);
    await expect(
      page.getByText('encrypted-aes.pdf', { exact: true }).first(),
    ).toBeVisible();
    await (PROCESSED[id] ?? rendered)(page);
  });
}

test('the decrypted output is real and says it is unencrypted', async ({
  page,
}) => {
  await page.goto(pathOf('pdf-to-text'));
  await page.locator('input[type=file]').setInputFiles(FILE);
  await page
    .getByLabel('Password for encrypted-aes.pdf', { exact: true })
    .fill('user-pw');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await page.getByRole('button', { name: 'Extract text' }).click();
  await expect(
    page.getByText('The original was password-protected. This file is not.'),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download encrypted-aes.txt', exact: true })
    .click();
  expect(
    readFileSync((await (await downloadPromise).path())!, 'utf8'),
  ).toContain('Locked 1');
});

test('a permissions-only PDF opens without a prompt', async ({ page }) => {
  await page.goto(pathOf('pdf-to-text'));
  await page.locator('input[type=file]').setInputFiles(OWNER_ONLY);
  await expect(
    page.getByText('encrypted-owner-only.pdf', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel(/^Password for /)).toHaveCount(0);
  await page.getByRole('button', { name: 'Extract text' }).click();
  await expect(
    page.getByText('The original was password-protected. This file is not.'),
  ).toBeVisible();
});

test('a locked file can be skipped', async ({ page }) => {
  await page.goto(pathOf('pdf-merger'));
  await page
    .locator('input[type=file]')
    .setInputFiles([FILE, 'test/fixtures/generated/text-3.pdf']);
  await expect(
    page.getByRole('list', { name: 'Files to merge' }).getByRole('listitem'),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Skip this file' }).click();
  await expect(
    page.getByLabel('Password for encrypted-aes.pdf', { exact: true }),
  ).toHaveCount(0);
});

test('Merger keeps drop order when locked files are unlocked later', async ({
  page,
}) => {
  const locked = readFileSync(FILE);
  await page.goto(pathOf('pdf-merger'));
  await page.locator('input[type=file]').setInputFiles([
    { name: 'a.pdf', mimeType: 'application/pdf', buffer: locked },
    {
      name: 'text-3.pdf',
      mimeType: 'application/pdf',
      buffer: readFileSync('test/fixtures/generated/text-3.pdf'),
    },
    { name: 'c.pdf', mimeType: 'application/pdf', buffer: locked },
  ]);
  const items = page
    .getByRole('list', { name: 'Files to merge' })
    .getByRole('listitem');
  await expect(items).toHaveCount(1);
  for (const name of ['c.pdf', 'a.pdf']) {
    const field = page.getByLabel(`Password for ${name}`, { exact: true });
    await field.fill('user-pw');
    // Enter submits the password of the file it is next to.
    await field.press('Enter');
  }
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText('a.pdf');
  await expect(items.nth(1)).toContainText('text-3.pdf');
  await expect(items.nth(2)).toContainText('c.pdf');
});
