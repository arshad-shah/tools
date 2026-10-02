import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { makeTestTsa } from '../fixtures/test-tsa';

/*
 * Signing+ (plan H-15): drawn, typed, photographed and initialled
 * signatures, smart placement, then a PAdES export with a self-signed
 * certificate and an opt-in timestamp, re-opened and verified, and a
 * tampered copy reported as invalid. Runs in the chromium-camera project
 * (a fake camera device).
 */
const FLAT = 'test/fixtures/generated/flat-form-word.pdf';
const PHOTO = 'test/fixtures/generated/signature-photo.png';
const TSA = 'https://tsa.test/';

const toolbar = (page: Page) =>
  page.getByRole('toolbar', { name: /Fill & Sign/ });
const panel = (page: Page) =>
  page.getByRole('dialog', { name: /Signature|Initials/ });

async function open(
  page: Page,
  file: string | { name: string; mimeType: string; buffer: Buffer },
) {
  await page.goto('/pdf/edit/fill-sign');
  await page.locator('input[type=file]').first().setInputFiles(file);
  await expect(
    page
      .locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]')
      .first(),
  ).toBeAttached({
    timeout: 20_000,
  });
}

async function openSignaturePanel(page: Page) {
  await toolbar(page)
    .getByRole('button', { name: 'Signature', exact: true })
    .click();
  await expect(panel(page)).toBeVisible();
  return panel(page);
}

test('signs with ink, type, photo and initials, then exports a verified PAdES signature', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const requests: { url: string; method: string }[] = [];
  page.on('request', (r) =>
    requests.push({ url: r.url(), method: r.method() }),
  );
  const tsa = await makeTestTsa();
  await page.route(`${TSA}**`, async (route) => {
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    };
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: cors });
    const body = await tsa.respond(
      new Uint8Array(route.request().postDataBuffer()!),
    );
    return route.fulfill({
      status: 200,
      headers: { ...cors, 'content-type': 'application/timestamp-reply' },
      body: Buffer.from(body),
    });
  });

  await open(page, FLAT);
  await expect(page.getByText(/^Detecting fields, page/)).toHaveCount(0, {
    timeout: 30_000,
  });

  // 1. Draw: a bold blue stroke, placed on the next place to sign (page 3).
  let sign = await openSignaturePanel(page);
  await sign.getByRole('tab', { name: 'Draw' }).click();
  await sign.getByRole('radio', { name: 'Bold' }).click();
  const pad = sign.getByRole('img', { name: 'Draw your signature' });
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 120);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++)
    await page.mouse.move(
      box.x + 40 + i * 25,
      box.y + 120 - Math.sin(i / 2) * 40,
      { steps: 3 },
    );
  await page.mouse.up();
  await sign.getByRole('button', { name: 'Next place to sign' }).click();
  await expect(sign).toHaveCount(0);
  await expect(
    page.getByRole('group', { name: 'Signature on page 3' }),
  ).toBeVisible({ timeout: 15_000 });

  // 2. Type: Jane Doe in the 4th style, slant 10, as initials on every page.
  sign = await openSignaturePanel(page);
  await sign.getByRole('tab', { name: 'Type' }).click();
  await sign.getByLabel('Your name').fill('Jane Doe');
  await sign.getByRole('radio').nth(3).click();
  const slant = sign.getByRole('slider', { name: 'Slant' });
  await slant.focus();
  for (let i = 0; i < 10; i++) await slant.press('ArrowRight');
  await expect(slant).toHaveAttribute('aria-valuetext', '10 degrees');
  await sign.getByRole('tab', { name: 'Initials' }).click();
  await expect(sign.getByLabel('Initials')).toHaveValue('JD');
  await sign.getByRole('button', { name: 'Initial pages' }).click();
  const pagesDialog = page.getByRole('dialog', { name: 'Initial pages' });
  await pagesDialog.getByRole('radio', { name: 'Every page' }).check();
  await pagesDialog
    .getByRole('button', { name: /^Initial \d+ pages$/ })
    .click();
  await expect(pagesDialog).toHaveCount(0);

  // 3. Photo: the fake camera shows a test pattern, so either outcome is
  // honest; then the uploaded photo is straightened and used.
  sign = await openSignaturePanel(page);
  await sign.getByRole('tab', { name: 'Photo' }).click();
  await sign.getByRole('button', { name: 'Start' }).click();
  await sign
    .getByRole('button', { name: 'Capture' })
    .click({ timeout: 20_000 });
  await expect(
    sign
      .getByRole('img', { name: 'Signature preview' })
      .or(sign.getByText('No signature found in this photo', { exact: false })),
  ).toBeVisible({ timeout: 30_000 });
  const retake = sign.getByRole('button', { name: 'Retake' });
  if (await retake.isVisible()) await retake.click();
  await sign.getByRole('radio', { name: 'Upload' }).click();
  const chooser = page.waitForEvent('filechooser');
  await sign.getByRole('button', { name: 'Choose a photo' }).click();
  await (await chooser).setFiles(PHOTO);
  await expect(sign.getByText(/Straightened by/)).toBeVisible({
    timeout: 30_000,
  });
  await sign.getByRole('button', { name: 'Use this signature' }).click();
  await page.keyboard.press('Escape');

  // 4. Export with a digital signature: self-signed, appearance = page 3.
  await page
    .getByRole('button', { name: /^Export/ })
    .first()
    .click();
  const exp = page.getByRole('dialog', { name: 'Export PDF' });
  await exp.getByRole('switch', { name: 'Sign digitally (PAdES)' }).click();
  await exp.getByRole('button', { name: 'Choose certificate' }).click();
  const cert = page.getByRole('dialog', { name: 'Signing certificate' });
  await cert.getByRole('radio', { name: 'Create self-signed' }).click();
  await cert.getByLabel('Name', { exact: true }).fill('Jane Doe');
  await cert.getByRole('button', { name: 'Create certificate' }).click();
  await cert.getByRole('button', { name: 'Use this certificate' }).click();
  await expect(cert).toHaveCount(0);
  await exp
    .getByLabel('Appearance')
    .selectOption({ label: 'Signature on page 3' });
  await exp.getByRole('switch', { name: /Add a trusted timestamp/ }).click();
  await exp.getByLabel('Timestamp server').fill(TSA);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exp.getByRole('button', { name: 'Sign and export' }).click(),
  ]);
  const signed = new Uint8Array(readFileSync((await download.path())!));

  // 6. Exactly one request leaves the origin: the timestamp POST.
  const origin = new URL(page.url()).origin;
  const foreign = requests.filter(
    (r) =>
      !r.url.startsWith(origin) &&
      !r.url.startsWith('data:') &&
      !r.url.startsWith('blob:'),
  );
  expect(foreign.filter((r) => r.method !== 'OPTIONS')).toEqual([
    { url: TSA, method: 'POST' },
  ]);

  // 5. Re-open: "Signed", a valid self-signed signature, timestamped.
  await open(page, {
    name: 'signed.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(signed),
  });
  await page
    .getByRole('button', { name: /Signed/ })
    .first()
    .click();
  const sigs = page.getByRole('dialog', {
    name: 'Signatures in this document',
  });
  await expect(
    sigs.getByText(
      'Valid signature from a self-signed certificate. Nobody has verified who Jane Doe is.',
    ),
  ).toBeVisible({ timeout: 20_000 });
  await expect(sigs.getByText('Time from a timestamp server')).toBeVisible();

  // 7. One changed byte inside the signed range: invalid.
  const tampered = signed.slice();
  // A byte of the binary header comment: inside the signed range, harmless
  // to the file's structure.
  tampered[11] ^= 0x01;
  await open(page, {
    name: 'tampered.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(tampered),
  });
  await page
    .getByRole('button', { name: /Signed/ })
    .first()
    .click();
  await expect(
    page
      .getByRole('dialog', { name: 'Signatures in this document' })
      .getByText(
        'Invalid. The document or the signature was changed after signing.',
      ),
  ).toBeVisible({ timeout: 20_000 });
});
