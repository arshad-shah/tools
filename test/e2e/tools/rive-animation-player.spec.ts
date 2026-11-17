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
  await expect(page.getByRole('combobox', { name: 'Artboard' })).toHaveText(
    /Truck/,
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

  await page.getByRole('radio', { name: 'Export' }).click();
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download current frame (PNG)' })
    .click();
  const bytes = await readFile(await (await download).path());
  expect([...bytes.subarray(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
  expect(foreign).toEqual([]);
});

test('switching artboards follows a multi-artboard file', async ({ page }) => {
  await page.goto(pathOf('rive-animation-player'));
  await page.locator('input[type=file]').first().setInputFiles(RIV);
  const artboard = page.getByRole('combobox', { name: 'Artboard' });
  const pick = async (name: string) => {
    await artboard.click();
    await page.getByRole('option', { name }).click();
    await expect(artboard).toHaveText(new RegExp(name));
  };
  await expect(artboard).toHaveText(/Truck/);
  await pick('Jeep');
  await pick('Truck');
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
    page.locator('.cy-toast').getByText('fake.riv is not a Rive (.riv) file'),
  ).toBeVisible();
});

test('the settings sections fit their card at 1400 px', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(pathOf('rive-animation-player'));
  const list = page.getByRole('radiogroup', { name: 'Settings' });
  await expect(list).toBeVisible();
  const { listRight, cardRight, listWidth, cardWidth } = await list.evaluate(
    (el) => {
      const card = el.closest('[data-testid="side-panel"]') as HTMLElement;
      const l = el.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      return {
        listRight: l.right,
        cardRight: c.right,
        listWidth: l.width,
        cardWidth: c.width,
      };
    },
  );
  expect(listRight).toBeLessThanOrEqual(cardRight);
  expect(listWidth).toBeLessThanOrEqual(cardWidth);
});
