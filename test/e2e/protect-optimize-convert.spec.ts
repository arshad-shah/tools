import { readFileSync } from 'node:fs';
import { inspect } from '@arshad-shah/qpdf-wasm';
import { unzipSync } from 'fflate';
import { expect, test, type Download, type Page } from '@playwright/test';
import { makeContentPdf } from '../fixtures/content';
import { pathOf } from './tool-routes';

/*
 * Spec §17 row E exit: protect at export and unlock round trip, compress
 * in Optimize, and a Markdown export from Convert (plan E-13 steps 2-4).
 */
const rendered = (page: Page) =>
  page.locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]');
const bytesOf = async (d: Download) =>
  new Uint8Array(readFileSync((await d.path())!));

async function open(page: Page, mode: string, file: string) {
  await page.goto(`/pdf/edit/${mode}`);
  await page.locator('input[type=file]').first().setInputFiles(file);
  await expect(rendered(page)).toBeAttached();
}

async function exportPdf(
  page: Page,
  fill?: (dialog: ReturnType<Page['getByRole']>) => Promise<void>,
) {
  await page
    .getByRole('button', { name: /^Export/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'Export PDF' });
  await fill?.(dialog);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  return download;
}

test('protect at export, reopen with the password, unlock with the quick task', async ({
  page,
}) => {
  const password = ['correct', 'horse'].join(' ');
  await open(page, 'protect', 'test/fixtures/generated/text-3.pdf');
  await page
    .getByRole('button', { name: 'Password protection' })
    .first()
    .click();
  await page.getByRole('switch', { name: 'Password protection' }).click();
  const download = await exportPdf(page, async (dialog) => {
    await dialog.getByLabel('Password to open', { exact: true }).fill(password);
    await dialog.getByLabel('Confirm password', { exact: true }).fill(password);
  });
  const protectedBytes = await bytesOf(download);
  expect((await inspect(protectedBytes)).needsPassword).toBe(true);
  const name = download.suggestedFilename();

  // Reopening asks for the password; the right one opens it.
  await page.goto('/pdf/edit');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name,
      mimeType: 'application/pdf',
      buffer: Buffer.from(protectedBytes),
    });
  await page.getByLabel(`Password for ${name}`, { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(rendered(page)).toBeAttached();

  // The Unlock quick task removes it.
  await page.goto(pathOf('pdf-unlock'));
  await page.locator('input[type=file]').setInputFiles({
    name,
    mimeType: 'application/pdf',
    buffer: Buffer.from(protectedBytes),
  });
  await page.getByLabel(`Password for ${name}`, { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Unlock PDF', exact: true }).click();
  const [unlocked] = await Promise.all([
    page.waitForEvent('download'),
    page
      .getByRole('button', { name: /^Download / })
      .first()
      .click(),
  ]);
  expect((await inspect(await bytesOf(unlocked))).encrypted).toBe(false);
});

test('Convert exports Markdown with a heading', async ({ page }) => {
  // A title twice the body size over two body lines.
  const report = await makeContentPdf([
    {
      content: [
        'BT /F1 24 Tf 72 700 Td (Quarterly report) Tj ET',
        'BT /F1 12 Tf 72 660 Td (The body text of the report.) Tj ET',
        'BT /F1 12 Tf 72 645 Td (A second body line follows.) Tj ET',
      ].join('\n'),
    },
  ]);
  await page.goto('/pdf/edit/convert');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(report),
    });
  await expect(rendered(page)).toBeAttached();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page
      .getByRole('button', { name: 'Markdown (best-effort structure)' })
      .first()
      .click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.md$/);
  const md = new TextDecoder().decode(await bytesOf(download));
  expect(md).toContain('<!-- Converted by tools');
  expect(md).toMatch(/^# Quarterly report$/m);
});

test('Convert saves every page as a PNG in one ZIP', async ({ page }) => {
  await open(page, 'convert', 'test/fixtures/generated/text-3.pdf');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Pages to images' }).first().click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
  const files = unzipSync(await bytesOf(download));
  const names = Object.keys(files);
  expect(names).toHaveLength(3);
  for (const name of names) {
    expect(name).toMatch(/\.png$/);
    // PNG signature: 0x89 then 'PNG'.
    expect([...files[name].subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  }
});

test('Optimize compresses a heavy file with Balanced and exports it', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const before = readFileSync(
    'test/fixtures/generated/images-heavy.pdf',
  ).byteLength;
  await open(page, 'optimize', 'test/fixtures/generated/images-heavy.pdf');
  await page.getByRole('radio', { name: 'Balanced' }).click();
  await page
    .getByRole('button', { name: 'Compress', exact: true })
    .last()
    .click();
  await expect(page.getByText(/^Compressed from /).first()).toBeVisible({
    timeout: 90_000,
  });
  const exported = await bytesOf(await exportPdf(page));
  expect(exported.byteLength).toBeLessThan(before);
});
