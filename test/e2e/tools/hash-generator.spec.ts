import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

type Page = import('@playwright/test').Page;
/** Types the message; the hashes show beside or under it. */
const typeMessage = (page: Page, text: string) =>
  page.getByRole('textbox', { name: 'Text to hash' }).fill(text);
/** A digest's value (element id `hash-<id>`). */
const digest = (page: Page, id: string) => page.locator(`#hash-${id}`);

test('computes HMAC only with the key the user enters', async ({ page }) => {
  await page.goto(pathOf('hash-generator'));
  await typeMessage(page, 'what do ya want for nothing?');
  await expect(digest(page, 'sha256')).toBeVisible();
  await expect(digest(page, 'hmac-sha256')).toHaveCount(0);
  await expect(
    page.getByText(/Enter an HMAC secret key to compute HMAC values/),
  ).toBeVisible();
  // RFC 4231 test case 2.
  await page.getByLabel('HMAC secret key').fill('Jefe');
  await expect(digest(page, 'hmac-sha256')).toHaveText(
    '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
  );
});

test('offers FIPS 202 SHA3-256 and a labelled Keccak-256', async ({ page }) => {
  await page.goto(pathOf('hash-generator'));
  await page.getByRole('button', { name: /Algorithms/ }).click();
  await page.getByRole('checkbox', { name: 'SHA3-256' }).click();
  await page.getByRole('checkbox', { name: 'Keccak-256 (Ethereum)' }).click();
  await page.keyboard.press('Escape');
  await typeMessage(page, 'abc');
  await expect(digest(page, 'sha3-256')).toHaveText(
    '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532',
  );
  await expect(
    page.getByText('Keccak-256 (Ethereum)', { exact: true }).last(),
  ).toBeVisible();
});

test('hashes an empty message', async ({ page }) => {
  await page.goto(pathOf('hash-generator'));
  await expect(digest(page, 'sha256')).toHaveCount(0);
  await page.getByRole('switch', { name: 'Hash an empty message' }).click();
  await expect(digest(page, 'sha256')).toHaveText(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  );
  await page.getByLabel('HMAC secret key').fill('key');
  await expect(digest(page, 'hmac-sha256')).toHaveText(
    '5d5d139563c95b5967b9bd9a8c9b233a9dedb45072794cd232dc1b74832607d0',
  );
});

test('the verify field identifies the algorithm', async ({ page }) => {
  await page.goto(pathOf('hash-generator'));
  await typeMessage(page, 'abc');
  await page
    .getByLabel('Expected hash')
    .fill(
      'sha256:BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD',
    );
  await expect(page.getByText('Match: SHA-256')).toBeVisible();
});

test('a 50 MB file shows progress and matches Node, with a checksum file', async ({
  page,
}, testInfo) => {
  const big = Buffer.alloc(50 * 1024 * 1024);
  for (let i = 0; i < big.length; i += 4096) big[i] = i & 0xff;
  const sha = createHash('sha256').update(big).digest('hex');
  await page.goto(pathOf('hash-generator'));
  await page.getByRole('radio', { name: 'Files' }).click();
  const path = testInfo.outputPath('big.bin');
  await writeFile(path, big);
  await page.locator('input[type=file]').first().setInputFiles(path);
  await expect(
    page.getByRole('progressbar', { name: /Hashing big\.bin/ }),
  ).toBeVisible();
  const grid = page.getByRole('table', { name: 'File hashes' });
  await expect(grid.getByText(sha)).toBeVisible({ timeout: 60_000 });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download checksums' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('checksums.sha256');
  expect(await readFile(await file.path(), 'utf8')).toBe(`${sha}  big.bin\n`);
});
