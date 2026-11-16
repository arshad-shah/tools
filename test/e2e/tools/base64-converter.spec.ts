import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

const cp = (...p: number[]) => String.fromCodePoint(...p);
const UNICODE = `${cp(0x20ac)} caf${cp(0xe9)} ${cp(0x2713)}`;
type Page = import('@playwright/test').Page;
/** A result CodeBlock (a figure named by its title). */
const block = (page: Page, name: string) =>
  page.getByRole('figure', { name, exact: true });
/** The Base64 result, beside or under the input. */
const result = async (page: Page) => block(page, 'Base64');

test('encodes and decodes Unicode text', async ({ page }) => {
  await page.goto(pathOf('base64-converter'));
  await page.getByRole('textbox', { name: 'Text to encode' }).fill(UNICODE);
  await expect(await result(page)).toContainText('4oKsIGNhZsOpIOKckw==');

  await page.getByRole('radio', { name: 'Decode' }).click();
  await page
    .getByRole('textbox', { name: 'Base64 to decode' })
    .fill('4oKsIGNhZsOpIOKckw==');
  await expect(block(page, 'Decoded text')).toContainText(UNICODE);
  await expect(page.getByText('UTF-8 text', { exact: true })).toBeVisible();
});

test('has URL-safe, padding and wrap variants', async ({ page }) => {
  await page.goto(pathOf('base64-converter'));
  await page
    .getByRole('textbox', { name: 'Text to encode' })
    .fill(`${cp(0x1f600)}?>`);
  await expect(await result(page)).toContainText('8J+YgD8+');
  await page.getByRole('switch', { name: 'URL-safe' }).click();
  await expect(await result(page)).toContainText('8J-YgD8-');
  await page.getByRole('textbox', { name: 'Text to encode' }).fill('a');
  await expect(await result(page)).toHaveText(/YQ(?!=)/);
  await page.getByRole('switch', { name: 'Padding' }).click();
  await expect(await result(page)).toContainText('YQ==');
});

test('swap flips the mode and moves the output to the input', async ({
  page,
}) => {
  await page.goto(pathOf('base64-converter'));
  await page.getByRole('textbox', { name: 'Text to encode' }).fill('hello');
  await page.getByRole('button', { name: 'Swap', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Base64 to decode' }),
  ).toHaveValue('aGVsbG8=');
  await expect(block(page, 'Decoded text')).toContainText('hello');
});

test('encodes a file to Base64 and a data URI', async ({ page }) => {
  await page.goto(pathOf('base64-converter'));
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles('test/fixtures/generated/tiny.gif');
  const expected = (
    await readFile('test/fixtures/generated/tiny.gif')
  ).toString('base64');
  await expect(await result(page)).toContainText(expected);
  await expect(block(page, 'Data URI')).toContainText(
    `data:image/gif;base64,${expected}`,
  );
  await expect(page.getByText('tiny.gif', { exact: true })).toBeVisible();
});

test('a PNG data URI shows the preview and the image insight', async ({
  page,
}) => {
  // 1x1 transparent PNG.
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  await page.goto(pathOf('base64-converter'));
  await page.getByRole('radio', { name: 'Decode' }).click();
  await page
    .getByRole('textbox', { name: 'Base64 to decode' })
    .fill(`data:image/png;base64,${png}`);
  await expect(page.getByText('Image (PNG 1x1)')).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Decoded Image (PNG 1x1)' }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download file' }).click();
  expect((await download).suggestedFilename()).toBe('decoded.png');
});

test('Send to opens a decoded JWT in the JWT Decoder', async ({ page }) => {
  const part = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  const jwt = `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: 'handoff-check' })}.c2ln`;
  await page.goto(pathOf('base64-converter'));
  await page.getByRole('radio', { name: 'Decode' }).click();
  await page
    .getByRole('textbox', { name: 'Base64 to decode' })
    .fill(Buffer.from(jwt).toString('base64'));
  await expect(page.getByText('JWT', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Send to' }).click();
  await page.getByRole('menuitem', { name: /JWT/ }).click();
  await expect(page).toHaveURL(new RegExp(pathOf('jwt-decode')));
  await expect(page.getByText('handoff-check').first()).toBeVisible();
});

test('decodes binary data to a downloadable file with a hex view', async ({
  page,
}) => {
  const gif = await readFile('test/fixtures/generated/tiny.gif');
  await page.goto(pathOf('base64-converter'));
  await page.getByRole('radio', { name: 'Decode' }).click();
  await page
    .getByRole('textbox', { name: 'Base64 to decode' })
    .fill(`data:image/gif;base64,${gif.toString('base64')}`);
  await expect(page.getByText(/Image \(GIF/)).toBeVisible();
  // Binary data opens as a hex dump: offset, bytes, ASCII.
  await expect(block(page, 'Decoded bytes')).toContainText(
    '00000000  47 49 46 38',
  );
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download file' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('decoded.gif');
  expect(await readFile(await file.path())).toEqual(gif);
});

test('downloads all of a large encoded file', async ({ page }) => {
  const big = randomBytes(2 * 1024 * 1024);
  await page.goto(pathOf('base64-converter'));
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'big.bin',
    mimeType: 'application/octet-stream',
    buffer: big,
  });
  await expect(page.getByText('big.bin', { exact: true })).toBeVisible();
  await expect(
    page.getByText(/^2(\.0)? MB, application\/octet-stream$/),
  ).toBeVisible();
  // The block shows a preview; Download saves all of it.
  await expect(page.getByText(/^Showing the first/).first()).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Base64' }).click();
  const text = await readFile(await (await download).path(), 'utf8');
  expect(text).toBe(big.toString('base64'));
});

test('decodes a percent-encoded binary data URI', async ({ page }) => {
  await page.goto(pathOf('base64-converter'));
  await page.getByRole('radio', { name: 'Decode' }).click();
  await page
    .getByRole('textbox', { name: 'Base64 to decode' })
    .fill('data:application/octet-stream,%FF%00%01');
  await expect(page.getByText(/Binary data \(3 B/)).toBeVisible();
});
