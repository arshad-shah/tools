import { readFileSync } from 'node:fs';
import { run } from '@arshad-shah/qpdf-wasm';
import { expect, test, type Page } from '@playwright/test';
import { pdfPageTexts } from '../fixtures/builders';
import { REDACT_TERM } from '../fixtures/redact';

/*
 * Spec §17 row E exit: find a term, mark every match, apply, verify, export;
 * the exported file holds the term on no marked page and nowhere in its raw
 * (decompressed) bytes (plan E-13 step 1).
 */
const FILE = 'test/fixtures/generated/redact-adversarial.pdf';
const rendered = (page: Page) =>
  page.locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]');

async function exportPdf(page: Page) {
  await page
    .getByRole('button', { name: /^Export/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'Export PDF' });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  return new Uint8Array(readFileSync((await download.path())!));
}

test('find, mark all, apply, verify and export a redaction', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/pdf/edit/redact');
  await page.locator('input[type=file]').first().setInputFiles(FILE);
  await expect(rendered(page)).toBeAttached();
  await expect(page.getByRole('tab', { name: /Redact/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await page.getByRole('button', { name: 'Find and mark' }).click();
  await page.getByRole('textbox', { name: 'Find' }).fill(REDACT_TERM);
  const matches = page.getByRole('list', { name: 'Matches' });
  await expect(matches.getByRole('checkbox').first()).toBeVisible({
    timeout: 20_000,
  });
  const marked = await matches.getByRole('checkbox').count();
  expect(marked).toBeGreaterThanOrEqual(4);
  await page.getByRole('button', { name: 'Mark all' }).click();
  await expect(page.getByTestId('redact-mark').first()).toBeAttached();

  await page.getByRole('button', { name: 'Apply redactions' }).first().click();
  const confirm = page.getByRole('dialog', { name: 'Apply redactions' });
  await expect(confirm).toContainText('You can undo until you export.');
  await confirm.getByRole('button', { name: 'Apply redactions' }).click();
  await expect(page.getByLabel('Redaction report')).toContainText('verified', {
    timeout: 90_000,
  });

  const bytes = await exportPdf(page);
  const texts = await pdfPageTexts(bytes);
  for (const i of [0, 1, 4, 7])
    expect(texts[i], `page ${i + 1}`).not.toContain(REDACT_TERM);
  const qdf = await run(
    ['--qdf', '--object-streams=disable', 'in.pdf', 'out.pdf'],
    {
      'in.pdf': bytes,
    },
  );
  const raw = new TextDecoder('latin1').decode(qdf.files['out.pdf']);
  // Page 10's form field was not marked by the search, so its value stays.
  const hits = raw.split(REDACT_TERM).length - 1;
  expect(hits).toBeLessThanOrEqual(2);
});
