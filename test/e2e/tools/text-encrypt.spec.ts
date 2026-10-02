import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

const PASS = ['correct', 'horse', 'battery'].join('-');

/** Independent tools-enc-v1 reader (spec §9.5), PBKDF2 only. */
async function openEnvelope(data: Buffer, pass: string): Promise<Buffer> {
  expect(data.subarray(0, 4).toString()).toBe('TENC');
  expect(data[4]).toBe(1);
  expect(data[5]).toBe(1);
  const iterations = data.readUInt32BE(6);
  const salt = new Uint8Array(data.subarray(10, 26));
  const iv = new Uint8Array(data.subarray(26, 38));
  const base = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pass),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const key = await webcrypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  return Buffer.from(
    await webcrypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: new Uint8Array(data.subarray(0, 38)),
      },
      key,
      new Uint8Array(data.subarray(38)),
    ),
  );
}

test('encrypts a file that Node can decrypt, and refuses a wrong passphrase', async ({
  page,
}) => {
  const original = await readFile('test/fixtures/generated/tiny.gif');
  await page.goto(pathOf('text-encrypt'));
  await page.getByRole('tab', { name: 'File' }).click();
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles('test/fixtures/generated/tiny.gif');
  await page.getByLabel('Passphrase', { exact: true }).fill(PASS);
  await page.getByLabel('Confirm passphrase').fill(PASS);
  await page.getByRole('button', { name: 'Encrypt file' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download tiny.gif.enc' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('tiny.gif.enc');
  const sealed = await readFile(await file.path());

  // Inner payload: u16 name, name, u16 mime, mime, bytes.
  const inner = await openEnvelope(sealed, PASS);
  const nameLen = inner.readUInt16BE(0);
  expect(inner.subarray(2, 2 + nameLen).toString()).toBe('tiny.gif');
  const mimeLen = inner.readUInt16BE(2 + nameLen);
  expect(inner.subarray(4 + nameLen, 4 + nameLen + mimeLen).toString()).toBe(
    'image/gif',
  );
  expect(inner.subarray(4 + nameLen + mimeLen)).toEqual(original);

  // Decrypt in the UI with the wrong passphrase.
  await page.getByRole('button', { name: 'Remove file' }).click();
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'tiny.gif.enc',
    mimeType: 'application/octet-stream',
    buffer: sealed,
  });
  await expect(
    page.getByText(/is encrypted: enter its passphrase/),
  ).toBeVisible();
  await page.getByLabel('Passphrase', { exact: true }).fill('not it');
  await page.getByRole('button', { name: 'Decrypt file' }).click();
  await expect(
    page.getByText('Wrong passphrase, or the data was changed'),
  ).toBeVisible();
  await page.getByLabel('Passphrase', { exact: true }).fill(PASS);
  await page.getByRole('button', { name: 'Decrypt file' }).click();
  const back = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download tiny.gif' }).click();
  const restored = await back;
  expect(restored.suggestedFilename()).toBe('tiny.gif');
  expect(await readFile(await restored.path())).toEqual(original);
});

test('encrypts and decrypts text', async ({ page }) => {
  await page.goto(pathOf('text-encrypt'));
  await page
    .getByRole('textbox', { name: 'Message', exact: true })
    .fill('hello there');
  await page.getByLabel('Passphrase', { exact: true }).fill(PASS);
  await page.getByLabel('Confirm passphrase').fill(PASS);
  await page.getByRole('button', { name: 'Encrypt', exact: true }).click();
  const out = page.getByRole('textbox', { name: 'Encrypted message' });
  await expect(out).toHaveValue(/BEGIN TOOLS ENCRYPTED MESSAGE/);
  const armoured = await out.inputValue();
  await page.getByRole('radio', { name: 'Decrypt' }).click();
  await page.getByRole('textbox', { name: 'Encrypted message' }).fill(armoured);
  await page.getByRole('button', { name: 'Decrypt', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Decrypted message' }),
  ).toHaveValue('hello there');
});
