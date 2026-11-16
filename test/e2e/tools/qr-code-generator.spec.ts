import { readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

const QR = `${pathOf('qr-code-generator')}?decoder=zxing`;

test('downloads a PNG', async ({ page }) => {
  await page.goto(QR);
  await page.getByRole('textbox', { name: 'URL' }).fill('https://example.com');
  await expect(
    page.getByRole('img', { name: 'QR code preview' }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('qr-url.png');
  const bytes = await readFile(await file.path());
  expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
});

test('a WiFi code with ; in the SSID decodes back and cannot be shared', async ({
  page,
}) => {
  await page.goto(QR);
  await page.getByRole('combobox', { name: 'Content type' }).click();
  await page.getByRole('option', { name: /Wi-?Fi/i }).click();
  await page
    .getByRole('textbox', { name: 'Network name (SSID)' })
    .fill('my;net');
  await page.getByLabel('Password', { exact: true }).fill('pw:1');
  // The preview sits beside the form: no pane to switch to.
  await expect(
    page.getByRole('figure', { name: 'Encoded text' }).locator('code'),
  ).toHaveText('WIFI:T:WPA;S:my\\;net;P:pw\\:1;;');
  await expect(page.getByText('Decodes correctly')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('button', { name: 'Share' })).toHaveCount(0);
});

test('a CSV batch gives a ZIP of 3 PNGs', async ({ page }) => {
  await page.goto(QR);
  await page.getByRole('radio', { name: 'Batch from CSV' }).click();
  await page
    .getByRole('region', { name: 'Batch from a CSV' })
    .locator('input[type=file]')
    .setInputFiles({
      name: 'links.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        'name,link\nOne,https://a.test\nTwo,https://b.test\nOne,https://c.test\n',
      ),
    });
  await page.getByRole('combobox', { name: 'Content column' }).click();
  await page
    .getByRole('option', { name: 'link', exact: true })
    .filter({ visible: true })
    .click();
  await page.getByRole('combobox', { name: 'File name column' }).click();
  const fileNames = page.getByRole('combobox', { name: 'File name column' });
  await page
    .locator(`#${await fileNames.getAttribute('aria-controls')}`)
    .getByRole('option', { name: 'name', exact: true })
    .click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download ZIP' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('links.zip');
  const names = Object.keys(
    unzipSync(new Uint8Array(await readFile(await file.path()))),
  );
  expect(names.sort()).toEqual(['One (2).png', 'One.png', 'Two.png']);
});

test('a local logo upload makes no network request', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    if (
      !r.url().startsWith('http://localhost') &&
      !r.url().startsWith('data:') &&
      !r.url().startsWith('blob:')
    )
      external.push(r.url());
  });
  await page.goto(QR);
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
  await page
    .getByRole('region', { name: 'Style' })
    .locator('input[type=file]')
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('button', { name: 'Remove logo' })).toBeVisible();
  await expect(
    page.getByText(/Decodes correctly|Could not decode/),
  ).toBeVisible({ timeout: 20_000 });
  expect(external).toEqual([]);
});
