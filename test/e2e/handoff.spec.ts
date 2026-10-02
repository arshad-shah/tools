import { expect, test } from '@playwright/test';

/*
 * Files dropped on a hub reach the tool that takes them (spec §5.3, plan
 * A2-13): the drop zone's file chooser is the same path as a drop.
 */
const GEN = 'test/fixtures/generated';

test('a CSV on the data hub opens in the CSV viewer', async ({ page }) => {
  await page.goto('/data');
  await page.locator('input[type=file]').setInputFiles({
    name: 'sample.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('name,qty\nTea,1\nCake,2\nPie,3\n'),
  });
  await expect(page).toHaveURL(/\/data\/csv$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'CSV Viewer & Converter' }),
  ).toBeVisible();
  for (const name of ['Tea', 'Cake', 'Pie'])
    await expect(
      page.getByRole('gridcell', { name, exact: true }),
    ).toBeVisible();
  // The one-time handoff id is gone from the URL after load.
  expect(new URL(page.url()).search).toBe('');
});

test('two PDFs on the PDF hub open in Merge with both files', async ({
  page,
}) => {
  await page.goto('/pdf');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles([`${GEN}/text-3.pdf`, `${GEN}/text-12.pdf`]);
  await expect(page).toHaveURL(/\/pdf\/merge$/);
  const rows = page.getByRole('list', { name: /^Files/ }).getByRole('listitem');
  await expect(rows).toHaveCount(2);
  await expect(page.getByText('text-3.pdf')).toBeVisible();
  await expect(page.getByText('text-12.pdf')).toBeVisible();
});

test('a PNG on the media hub opens in the image optimizer', async ({
  page,
}) => {
  await page.goto('/media');
  await page.locator('input[type=file]').setInputFiles(`${GEN}/photo.png`);
  await expect(page).toHaveURL(/\/media\/image-optimizer$/);
  await expect(page.getByRole('img', { name: 'Preview' })).toBeVisible();
});

test('a PNG on the text hub is refused inline', async ({ page }) => {
  await page.goto('/text');
  await page.locator('input[type=file]').setInputFiles(`${GEN}/photo.png`);
  await expect(page.getByRole('alert')).toContainText(
    'No tool here accepts these files',
  );
  expect(new URL(page.url()).pathname).toBe('/text');
});
