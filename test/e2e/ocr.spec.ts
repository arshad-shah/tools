import { expect, test, type Page } from '@playwright/test';
import { pdfPageTexts } from '../fixtures/builders';
import {
  drag,
  exportPdf,
  openInWorkspace,
  slotOf,
  xy,
} from './workspace-helpers';

/*
 * Plan F-8 (spec §17 row F exit): OCR on scan-form.pdf with same-origin
 * assets only, the stored-data second run, and the Run OCR entry points.
 */
const SCAN = 'test/fixtures/generated/scan-form.pdf';
const TYPE3 = 'test/fixtures/generated/type3-font.pdf';
/** Engine and language files; the manifest (sizes only) is not OCR data. */
const OCR_DATA = /\/ocr\/.*\.(js|wasm|gz)(\?|$)/;
const LANGUAGE = /\.traineddata\.gz(\?|$)/;

/** Every http(s) request the page makes, in order. */
function recordRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (r) => {
    if (/^https?:/.test(r.url())) urls.push(r.url());
  });
  return urls;
}

const ocrTab = (page: Page) => page.getByRole('tab', { name: /OCR/ });

async function openForOcr(page: Page) {
  await openInWorkspace(page, SCAN, /OCR/);
  await expect(
    page.getByRole('heading', { name: 'Make this document searchable' }),
  ).toBeVisible();
}

test('OCR runs on the scan with same-origin data only, then from storage', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(240_000);
  const origin = new URL(baseURL!).origin;
  const urls = recordRequests(page);
  await openForOcr(page);
  await expect(
    page.getByText(/^English OCR data: .+ MB download/),
  ).toBeVisible();
  // Consent first: no engine or language file before the click.
  expect(urls.filter((u) => OCR_DATA.test(u))).toEqual([]);

  await page.getByRole('button', { name: 'Download and run' }).click();
  const report = page.getByLabel('OCR report');
  await expect(report).toContainText('Text layer added to 1 page', {
    timeout: 180_000,
  });
  await expect(report).toContainText(/Page 1: \d+ words/);
  expect(urls.some((u) => LANGUAGE.test(u))).toBe(true);
  // The rail marks the page that gained text.
  await expect(
    page.getByRole('listbox', { name: 'Pages' }).getByText('Text added'),
  ).toBeVisible();

  const bytes = await exportPdf(page);
  const [text] = await pdfPageTexts(bytes);
  for (const word of ['Applicant', 'Surname', 'Postcode'])
    expect(text).toContain(word);
  // No third-party request at all (decision G11).
  expect(urls.filter((u) => new URL(u).origin !== origin)).toEqual([]);

  // A second page in the same browser: the data is stored, nothing to download.
  const second = await context.newPage();
  const again = recordRequests(second);
  await openForOcr(second);
  await expect(
    second.getByText('English OCR data is stored on this device.'),
  ).toBeVisible();
  await second
    .getByRole('complementary')
    .getByRole('button', { name: 'Run OCR' })
    .click();
  await expect(second.getByLabel('OCR report')).toContainText(
    'Text layer added to 1 page',
    { timeout: 180_000 },
  );
  expect(again.filter((u) => LANGUAGE.test(u))).toEqual([]);
  expect(again.filter((u) => new URL(u).origin !== origin)).toEqual([]);
});

test('Annotate offers Run OCR on a page without text', async ({ page }) => {
  await openInWorkspace(page, SCAN, /Annotate/);
  await page
    .getByRole('toolbar')
    .getByRole('button', { name: 'Highlight', exact: true })
    .click();
  const { at } = await slotOf(page);
  await page.mouse.click(...xy(at(300, 400)));
  await expect(
    page.getByText('No text here. Run OCR to make it selectable.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Run OCR' }).click();
  await expect(ocrTab(page)).toHaveAttribute('aria-selected', 'true');
});

test('the Redact report offers Run OCR for a page turned into an image', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openInWorkspace(page, TYPE3, /Redact/);
  const markArea = page
    .getByRole('toolbar')
    .getByRole('button', { name: 'Mark area', exact: true });
  await markArea.click();
  const { at } = await slotOf(page);
  await drag(page, at(60, 730), at(400, 690));
  // Leaving the drawing tool makes the mark a placed object (FIX-OVERLAYS).
  await markArea.click();
  await expect(page.getByTestId('redact-mark').first()).toBeAttached();
  await page.getByRole('button', { name: 'Apply redactions' }).first().click();
  await page
    .getByRole('dialog', { name: 'Apply redactions' })
    .getByRole('button', { name: 'Apply redactions' })
    .click();
  const report = page.getByLabel('Redaction report');
  await expect(report).toContainText('Turned into an image', {
    timeout: 90_000,
  });
  await report.getByRole('button', { name: 'Run OCR' }).click();
  await expect(ocrTab(page)).toHaveAttribute('aria-selected', 'true');
});
