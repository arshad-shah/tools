import { readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import UPNG from 'upng-js';
import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

test('a text icon "T" downloads a ZIP of seven files with a valid ICO and a 512 px icon', async ({
  page,
}) => {
  await page.goto(pathOf('favicon-generator'));
  await page
    .getByRole('textbox', { name: 'Text (1 to 3 characters)' })
    .fill('T');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download ZIP' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('favicons.zip');
  const zip = unzipSync(new Uint8Array(await readFile(await file.path())));
  expect(Object.keys(zip).sort()).toEqual([
    'apple-touch-icon.png',
    'favicon.ico',
    'icon-192.png',
    'icon-512.png',
    'icon-maskable-512.png',
    'link-tags.html',
    'site.webmanifest',
  ]);
  const ico = new DataView(
    zip['favicon.ico'].buffer,
    zip['favicon.ico'].byteOffset,
  );
  expect([
    ico.getUint16(0, true),
    ico.getUint16(2, true),
    ico.getUint16(4, true),
  ]).toEqual([0, 1, 3]);
  const icon = UPNG.decode(zip['icon-512.png'].slice().buffer);
  expect([icon.width, icon.height]).toEqual([512, 512]);
  const manifest = JSON.parse(
    new TextDecoder().decode(zip['site.webmanifest']),
  ) as {
    icons: unknown[];
  };
  expect(manifest.icons).toHaveLength(3);
});
