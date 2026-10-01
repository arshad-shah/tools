import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { inspect, run } from '@arshad-shah/qpdf-wasm';
import { PDFDocument } from 'pdf-lib';

test('protects a PDF and unlocks it again (round trip)', async ({ page }) => {
  await page.goto('/pdf-protect');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByLabel('Password to open', { exact: true }).fill('s3cret');
  await page.getByLabel('Confirm password', { exact: true }).fill('s3cre');
  await expect(page.getByText('The passwords do not match')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Protect PDF' }),
  ).toBeDisabled();
  await page.getByLabel('Confirm password', { exact: true }).fill('s3cret');
  await page
    .getByRole('checkbox', { name: 'Allow copying text and images' })
    .click();
  await page.getByRole('button', { name: 'Protect PDF' }).click();
  let promise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download text-3.protected.pdf' })
    .click();
  let d = await promise;
  expect(d.suggestedFilename()).toBe('text-3.protected.pdf');
  const protectedBytes = new Uint8Array(readFileSync((await d.path())!));
  expect(await inspect(protectedBytes)).toMatchObject({
    encrypted: true,
    needsPassword: true,
  });
  const shown = await run(
    ['--show-encryption', '--password=s3cret', 'in.pdf'],
    { 'in.pdf': protectedBytes },
  );
  expect(shown.stdout).toContain('file encryption method: AESv3');
  expect(shown.stdout).toContain('extract for any purpose: allowed');

  await page.goto('/pdf-unlock');
  await page.locator('input[type=file]').setInputFiles({
    name: 'text-3.protected.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(protectedBytes),
  });
  const password = page.getByLabel('Password for text-3.protected.pdf', {
    exact: true,
  });
  await password.fill('wrong');
  await page.getByRole('button', { name: 'Unlock PDF' }).click();
  await expect(
    page.getByText('That password is not correct. Try again.'),
  ).toBeVisible();
  await password.fill('s3cret');
  await page.getByRole('button', { name: 'Unlock PDF' }).click();
  promise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download text-3.protected.unlocked.pdf' })
    .click();
  d = await promise;
  expect(d.suggestedFilename()).toBe('text-3.protected.unlocked.pdf');
  const plain = new Uint8Array(readFileSync((await d.path())!));
  expect(await inspect(plain)).toMatchObject({ encrypted: false });
  expect((await PDFDocument.load(plain)).getPageCount()).toBe(3);
});

test('comments force form filling on, and a new file starts with empty passwords (review M1, M2)', async ({
  page,
}) => {
  await page.goto('/pdf-protect');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  const forms = page.getByRole('checkbox', { name: 'Allow filling forms' });
  const comments = page.getByRole('checkbox', { name: 'Allow comments' });
  await expect(comments).toHaveAttribute('aria-checked', 'true');
  await expect(forms).toHaveAttribute('aria-checked', 'true');
  await expect(forms).toBeDisabled();
  await comments.click();
  await expect(forms).toBeEnabled();
  await comments.click();
  await page.getByLabel('Password to open', { exact: true }).fill('x');
  await page.getByRole('button', { name: 'Choose another file' }).click();
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await expect(
    page.getByLabel('Password to open', { exact: true }),
  ).toHaveValue('');
});

test('unlock explains when there is nothing to unlock', async ({ page }) => {
  await page.goto('/pdf-unlock');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await expect(
    page.getByText(
      "This PDF isn't password-protected. There is nothing to unlock.",
    ),
  ).toBeVisible();
});

test('unlock asks for the permissions password of a permissions-only file', async ({
  page,
}) => {
  await page.goto('/pdf-unlock');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/encrypted-owner-only.pdf');
  await expect(
    page.getByText(/opens without a password but has permission restrictions/),
  ).toBeVisible();
  await page
    .getByLabel('Password for encrypted-owner-only.pdf', { exact: true })
    .fill('owner-pw');
  await page.getByRole('button', { name: 'Unlock PDF' }).click();
  const promise = page.waitForEvent('download');
  await page
    .getByRole('button', {
      name: 'Download encrypted-owner-only.unlocked.pdf',
    })
    .click();
  const plain = new Uint8Array(readFileSync((await (await promise).path())!));
  expect(await inspect(plain)).toMatchObject({ encrypted: false });
});
