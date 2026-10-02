import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';

const SCAN = `${pathOf('qr-scanner')}?decoder=zxing`;

/** A QR PNG made by the generator page (its own export) at test time. */
async function makeQr(
  page: Page,
  set: (p: Page) => Promise<void>,
): Promise<Buffer> {
  await page.goto(pathOf('qr-code-generator'));
  await set(page);
  await page.getByRole('tab', { name: 'Export' }).click();
  await page.getByRole('combobox', { name: 'PNG size' }).selectOption('512');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const { readFile } = await import('node:fs/promises');
  return readFile(await (await download).path());
}

test('reads a URL from an image with same-origin requests only', async ({
  page,
}) => {
  const png = await makeQr(page, (p) =>
    p.getByRole('textbox', { name: 'URL' }).fill('https://example.com/scanned'),
  );
  const origins = new Set<string>();
  page.on('request', (r) => {
    const u = r.url();
    if (/^https?:/.test(u)) origins.add(new URL(u).origin);
  });
  await page.goto(SCAN);
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'qr.png', mimeType: 'image/png', buffer: png });
  await expect(
    page.getByText('https://example.com/scanned').first(),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Link' })).toBeVisible();
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});

test('a WiFi code keeps the password masked until revealed', async ({
  page,
}) => {
  const png = await makeQr(page, async (p) => {
    await p
      .getByRole('combobox', { name: 'Content type' })
      .selectOption('wifi');
    await p.getByRole('textbox', { name: 'Network name (SSID)' }).fill('Cafe');
    await p.getByLabel('Password').fill('s3cret-pass');
  });
  await page.goto(SCAN);
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'wifi.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Cafe')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('s3cret-pass')).toHaveCount(0);
  await page
    .getByRole('button', { name: /Reveal|Show/ })
    .first()
    .click();
  await expect(page.getByText('s3cret-pass')).toBeVisible();
});
