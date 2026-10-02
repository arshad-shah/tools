import { expect, test } from '@playwright/test';
import { imagePlacements, textPositions } from '../fixtures/builders';
import { exportPdf, openInWorkspace, slotOf, xy } from './workspace-helpers';

/*
 * Plan D-10 step 3: Edit content and page markup through export (spec §9.2).
 */
const TEXT = 'test/fixtures/generated/text-3.pdf';
const tool = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('toolbar').getByRole('button', { name, exact: true });

test('text, image, header and footer and a watermark export where placed', async ({
  page,
}) => {
  await openInWorkspace(page, TEXT, /Edit/);
  // Measured per gesture: the canvas moves when the inspector opens.
  const at = async (x: number, y: number) => (await slotOf(page)).at(x, y);

  await tool(page, 'Text').click();
  await expect(page.getByTestId('edit-place-1')).toBeAttached();
  await page.mouse.click(...xy(await at(100, 560)));
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('Hello');
  await page.getByRole('button', { name: 'Add text' }).click();

  await page
    .locator('input[type=file][accept*="image/png"]')
    .setInputFiles('test/fixtures/generated/photo.png');
  await expect(tool(page, 'Image')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('edit-place-1')).toBeAttached();
  await page.mouse.click(...xy(await at(400, 560)));
  await expect(
    page.getByRole('button', { name: 'Undo Add image on page 1' }),
  ).toBeAttached();

  await tool(page, 'Header and footer').click();
  await expect(page.getByLabel('Footer centre')).toHaveValue(
    'Page {n} of {total}',
  );
  await page.getByRole('button', { name: 'Add header and footer' }).click();

  await tool(page, 'Watermark').click();
  await page.getByLabel('Watermark text').fill('DRAFT');
  await page.getByRole('button', { name: 'Add watermark' }).click();

  const out = await exportPdf(page);
  const texts = (await textPositions(out, 0)).map((t) => t.str);
  expect(texts).toEqual(
    expect.arrayContaining(['Hello', 'Page 1 of 3', 'DRAFT']),
  );
  expect((await textPositions(out, 2)).map((t) => t.str)).toContain(
    'Page 3 of 3',
  );
  const hello = (await textPositions(out, 0)).find((t) => t.str === 'Hello')!;
  expect(hello.x).toBeGreaterThan(95);
  expect(hello.x).toBeLessThan(110);
  expect(await imagePlacements(out, 0)).toHaveLength(1);
});

test('the old watermark and page-number tools are gone', async ({ page }) => {
  for (const path of ['/pdf/watermark', '/pdf/page-numbers']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      `No page at ${path}`,
    );
  }
});
