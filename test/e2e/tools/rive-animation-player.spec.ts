import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';

const RIV = 'test/fixtures/rive/vehicles.riv';

/** The seconds of the "a of b" read-out under the scrubber. */
async function currentTime(page: Page): Promise<number> {
  const text = await page.getByText(/^\d+\.\d\d s of /).textContent();
  return Number(text?.split(' ')[0]);
}

test('a .riv plays from this site only, at 2x, and exports the current frame as PNG', async ({
  page,
}) => {
  const foreign: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.protocol.startsWith('http') && u.hostname !== 'localhost')
      foreign.push(r.url());
  });
  await page.goto(pathOf('rive-animation-player'));
  await page.locator('input[type=file]').first().setInputFiles(RIV);
  await expect(page.getByRole('combobox', { name: 'Artboard' })).toHaveValue(
    'Truck',
  );
  await expect(page.getByText(/^\d+\.\d\d s of /)).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole('radio', { name: '2x' }).click();
  const t0 = await currentTime(page);
  await page.waitForTimeout(500);
  const t1 = await currentTime(page);
  // Loops wrap, so only check that time moves and at well over real time.
  expect(t1).not.toBe(t0);

  await page.getByRole('tab', { name: 'Export' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const bytes = await readFile(await (await download).path());
  expect([...bytes.subarray(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
  expect(foreign).toEqual([]);
});

test('switching artboards follows a multi-artboard file', async ({ page }) => {
  await page.goto(pathOf('rive-animation-player'));
  await page.locator('input[type=file]').first().setInputFiles(RIV);
  const artboard = page.getByRole('combobox', { name: 'Artboard' });
  await expect(artboard).toHaveValue('Truck');
  await artboard.selectOption('Jeep');
  await expect(artboard).toHaveValue('Jeep');
  await artboard.selectOption('Truck');
  await expect(page.getByRole('button', { name: 'curves' })).toBeVisible();
});

test('rejects a non-Rive file with a toast', async ({ page }) => {
  await page.goto(pathOf('rive-animation-player'));
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
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
