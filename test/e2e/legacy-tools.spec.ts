import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('color-tester exports the palette as JSON', async ({ page }) => {
  await page.goto('/color-tester');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('color-palette.json');
  const body: unknown = JSON.parse(await readFile(await file.path(), 'utf8'));
  expect(Array.isArray(body)).toBe(true);
});

test('qr-code-generator downloads a PNG', async ({ page }) => {
  await page.goto('/qr-code-generator');
  await page.getByRole('textbox').first().fill('https://example.com');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download QR code' }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^qrcode-[a-z]+-\d+\.png$/,
  );
});

test('url-encoder-decoder copies output', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/url-encoder-decoder');
  await page.getByRole('textbox').first().fill('a b&c');
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'a%20b%26c',
  );
});

test('jwt-decode shows "Copied" only on the button pressed', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/jwt-decode');
  await page.getByRole('tab', { name: 'Signature' }).click();
  await page.getByRole('button', { name: 'Signature value' }).click();
  const copy = page.getByRole('button', { name: 'Copy', exact: true });
  await expect(copy).toHaveCount(2); // token + signature
  await copy.last().click();
  await expect(page.getByRole('button', { name: 'Copied' })).toHaveCount(1);
  await expect(copy).toHaveCount(1);
});

test('jwt-decode accordion triggers have accessible names', async ({
  page,
}) => {
  await page.goto('/jwt-decode');
  for (const name of [
    'Identity claims',
    'Access & permissions',
    'Timestamps',
    'Issuer information',
    'Custom claims',
    'Raw JSON',
  ]) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }
  // A <button> may only hold phrasing content (no <div>/<p>).
  await expect(page.locator('main button :is(div, p)')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Signature' }).click();
  await expect(page.locator('main button :is(div, p)')).toHaveCount(0);
});

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

test('image-optimizer converts and downloads', async ({ page }) => {
  await page.goto('/image-optimizer');
  await page.locator('input[type=file]').setInputFiles({
    name: 'dot.png',
    mimeType: 'image/png',
    buffer: Buffer.from(PNG_1PX, 'base64'),
  });
  await expect(page.getByText('1 × 1px')).toBeVisible();
  await page.getByRole('button', { name: 'Convert & compress' }).click();
  await expect(page.getByText('Processing complete')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download image' }).click();
  expect((await download).suggestedFilename()).toBe('dot.optimized.jpeg');
});

test('image-optimizer rejects non-images inline', async ({ page }) => {
  await page.goto('/image-optimizer');
  await page.locator('input[type=file]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hi'),
  });
  await expect(page.getByText('notes.txt is not an image')).toBeVisible();
});

test('csv-viewer loads a CSV and exports it', async ({ page }) => {
  await page.goto('/csv-viewer');
  await page.locator('input[type=file]').setInputFiles({
    name: 'people.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('name,age\nAda,36\nBob,7\n'),
  });
  await expect(page.getByRole('cell', { name: 'Ada' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  expect((await download).suggestedFilename()).toBe('people.exported.csv');
});

test('csv-viewer rejects a non-text file inline', async ({ page }) => {
  await page.goto('/csv-viewer');
  await page.locator('input[type=file]').setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from('png'),
  });
  await expect(
    page.getByText('photo.png is not a supported text file (.csv, .tsv, .txt)'),
  ).toBeVisible();
});

test('csv-viewer still parses a dropped .txt as CSV', async ({ page }) => {
  await page.goto('/csv-viewer');
  await page.locator('input[type=file]').setInputFiles({
    name: 'data.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('city,pop\nOslo,700000\n'),
  });
  await expect(page.getByRole('cell', { name: 'Oslo' })).toBeVisible();
});

test('text-diff-checker loads a file into the left pane', async ({ page }) => {
  await page.goto('/text-diff-checker');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'left.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello left'),
    });
  await expect(page.getByText('left.txt loaded successfully')).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Original text' }),
  ).toHaveValue('hello left');
});

test('rive-animation-player rejects a non-Rive file with a toast', async ({
  page,
}) => {
  await page.goto('/rive-animation-player');
  await page.locator('input[type=file]').setInputFiles({
    name: 'fake.riv',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('nope'),
  });
  await expect(
    page
      .locator('[data-sonner-toast]')
      .getByText('fake.riv is not a Rive (.riv) file'),
  ).toBeVisible();
});

test('api-request keeps collections saved under the legacy key', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('kit:store:tool:api-request')) return;
    localStorage.setItem(
      'apiTesterCollections',
      JSON.stringify([
        {
          id: 'legacy',
          type: 'folder',
          name: 'Legacy Collection',
          children: [
            {
              id: 'legacy-req',
              type: 'request',
              name: 'Legacy Request',
              method: 'GET',
              url: 'https://example.com',
            },
          ],
        },
      ]),
    );
  });
  await page.goto('/api-request');
  await expect(page.getByText('Legacy Collection')).toBeVisible();
  await expect(page.getByText('Legacy Request')).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem('apiTesterCollections')),
  ).toBeNull();
  await page.reload();
  await expect(page.getByText('Legacy Collection')).toBeVisible();
});

test('api-request toasts invalid input instead of window.alert', async ({
  page,
}) => {
  page.on('dialog', () => {
    throw new Error('unexpected window dialog');
  });
  await page.goto('/api-request');
  await page.getByRole('button', { name: 'New request' }).first().click();
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(
    page.locator('[data-sonner-toast]').getByText('Please enter a URL'),
  ).toBeVisible();
});

test('text-diff-checker accepts a text/plain file of any extension', async ({
  page,
}) => {
  await page.goto('/text-diff-checker');
  await page
    .locator('input[type=file]')
    .last()
    .setInputFiles({
      name: 'script.py',
      mimeType: 'text/plain',
      buffer: Buffer.from('print("right")'),
    });
  await expect(page.getByText('script.py loaded successfully')).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Modified text' }),
  ).toHaveValue('print("right")');
});

test('api-request keeps the last response when a send fails validation', async ({
  page,
}) => {
  await page.route('https://jsonplaceholder.typicode.com/users', (route) =>
    route.fulfill({ json: [{ id: 1, name: 'Mocked' }] }),
  );
  await page.goto('/api-request');
  await page.getByText('Get Users').click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('200', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Mocked')).toBeVisible();
  await page.getByRole('textbox', { name: 'Request URL' }).fill('');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(
    page.locator('[data-sonner-toast]').getByText('Please enter a URL'),
  ).toBeVisible();
  await expect(page.getByText('Mocked')).toBeVisible();
});
