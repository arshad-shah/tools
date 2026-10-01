import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const FILE = 'test/fixtures/generated/encrypted-aes.pdf';
const OWNER_ONLY = 'test/fixtures/generated/encrypted-owner-only.pdf';
const ROUTES = [
  '/pdf-merger',
  '/pdf-splitter',
  '/pdf-organize',
  '/pdf-to-images',
  '/pdf-to-text',
  '/pdf-watermark',
  '/pdf-page-numbers',
  '/pdf-sign',
  '/pdf-fill-form',
  '/pdf-compressor',
  '/pdf-metadata',
  '/pdf-protect',
];

/** Proof that the tool really worked on the decrypted bytes. */
const PROCESSED: Record<string, (page: Page) => Promise<void>> = {
  '/pdf-fill-form': (page) =>
    expect(
      page.getByText('This PDF has no fillable form fields.'),
    ).toBeVisible(),
  '/pdf-metadata': (page) =>
    expect(page.getByLabel('Title', { exact: true })).toHaveValue(
      'Locked fixture',
    ),
};
const rendered = (page: Page) =>
  expect(page.locator('canvas[data-rendered="true"]').first()).toBeAttached();

for (const route of ROUTES) {
  test(`${route} asks for the password of an AES-256 PDF and opens it`, async ({
    page,
  }) => {
    await page.goto(route);
    await page.locator('input[type=file]').first().setInputFiles(FILE);
    const password = page.getByLabel('Password for encrypted-aes.pdf', {
      exact: true,
    });
    await password.fill('wrong');
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();
    await expect(
      page
        .getByRole('alert')
        .getByText('That password is not correct. Try again.'),
    ).toBeVisible();
    await password.fill('user-pw');
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();
    await expect(password).toHaveCount(0);
    await expect(
      page.getByText('encrypted-aes.pdf', { exact: true }).first(),
    ).toBeVisible();
    await (PROCESSED[route] ?? rendered)(page);
  });
}

test('the decrypted output is real and says it is unencrypted', async ({
  page,
}) => {
  await page.goto('/pdf-to-text');
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
  await page.goto('/pdf-to-text');
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
  await page.goto('/pdf-merger');
  await page
    .locator('input[type=file]')
    .setInputFiles([FILE, 'test/fixtures/generated/text-3.pdf']);
  await expect(page.locator('li[data-sortable-item]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Skip this file' }).click();
  await expect(
    page.getByLabel('Password for encrypted-aes.pdf', { exact: true }),
  ).toHaveCount(0);
});

test('Merger keeps drop order when locked files are unlocked later', async ({
  page,
}) => {
  const locked = readFileSync(FILE);
  await page.goto('/pdf-merger');
  await page.locator('input[type=file]').setInputFiles([
    { name: 'a.pdf', mimeType: 'application/pdf', buffer: locked },
    {
      name: 'text-3.pdf',
      mimeType: 'application/pdf',
      buffer: readFileSync('test/fixtures/generated/text-3.pdf'),
    },
    { name: 'c.pdf', mimeType: 'application/pdf', buffer: locked },
  ]);
  const items = page.locator('li[data-sortable-item]');
  await expect(items).toHaveCount(1);
  for (const name of ['c.pdf', 'a.pdf']) {
    await page
      .getByLabel(`Password for ${name}`, { exact: true })
      .fill('user-pw');
    await page
      .getByRole('form', { name: `Unlock ${name}` })
      .getByRole('button', { name: 'Unlock', exact: true })
      .click();
  }
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText('a.pdf');
  await expect(items.nth(1)).toContainText('text-3.pdf');
  await expect(items.nth(2)).toContainText('c.pdf');
});
