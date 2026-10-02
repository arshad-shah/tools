import { readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import exifr from 'exifr';
import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

const GEN = 'test/fixtures/generated';
const FIXTURES = ['exif-gps.jpg', 'exif-text.png', 'exif-xmp.webp'];

test('strips the three fixtures and the ZIP has no GPS or EXIF left', async ({
  page,
}) => {
  await page.goto(pathOf('exif-tool'));
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(FIXTURES.map((f) => `${GEN}/${f}`));
  await expect(page.getByTestId('risk-level')).toContainText(/high/i);
  await page.getByRole('button', { name: 'Remove metadata' }).click();
  const grid = page.getByRole('grid', { name: 'Files to clean' });
  await expect(grid.getByText('Done', { exact: true })).toHaveCount(3, {
    timeout: 20_000,
  });

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download ZIP' }).click();
  const zip = unzipSync(
    new Uint8Array(await readFile(await (await download).path())),
  );
  expect(Object.keys(zip).sort()).toEqual([...FIXTURES].sort());
  for (const [name, bytes] of Object.entries(zip)) {
    const gps = await exifr.gps(Buffer.from(bytes)).catch(() => undefined);
    expect(gps, name).toBeUndefined();
    if (name.endsWith('.webp')) {
      // exifr cannot read WebP: check the RIFF chunks directly.
      const text = Buffer.from(bytes).toString('latin1');
      expect(text.includes('EXIF'), name).toBe(false);
      expect(text.includes('XMP '), name).toBe(false);
    } else {
      const meta = (await exifr.parse(Buffer.from(bytes), {
        mergeOutput: false,
      })) as Record<string, unknown> | undefined;
      expect(meta?.exif, name).toBeUndefined();
    }
  }
});
