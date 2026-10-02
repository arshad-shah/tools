import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

const cp = (...p: number[]) => String.fromCodePoint(...p);
const UNICODE = `${cp(0x20ac)} caf${cp(0xe9)} ${cp(0x2713)}`;
type Page = import('@playwright/test').Page;
/** R41 tabs: shows a pane by its tab. */
const show = (page: Page, name: 'Input' | 'Output') =>
  page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();
/** Shows the Output pane, then returns the result editor. */
const result = async (page: Page) => {
  await show(page, 'Output');
  return page.getByRole('textbox', { name: 'Result', exact: true });
};

test('encodes and decodes Unicode text', async ({ page }) => {
  await page.goto(pathOf('base64-converter'));
  await page.getByRole('textbox', { name: 'Text to encode' }).fill(UNICODE);
  await expect(await result(page)).toHaveValue('4oKsIGNhZsOpIOKckw==');

  await page.getByRole('radio', { name: 'Decode' }).click();
  await show(page, 'Input');
  await page
    .getByRole('textbox', { name: 'Base64 to decode' })
    .fill('4oKsIGNhZsOpIOKckw==');
  await expect(await result(page)).toHaveValue(UNICODE);
  await expect(page.getByText('UTF-8 text', { exact: true })).toBeVisible();
});

test('has URL-safe, padding and wrap variants', async ({ page }) => {
  await page.goto(pathOf('base64-converter'));
  await page
    .getByRole('textbox', { name: 'Text to encode' })
    .fill(`${cp(0x1f600)}?>`);
  await expect(await result(page)).toHaveValue('8J+YgD8+');
  await page.getByRole('switch', { name: 'URL-safe' }).click();
  await expect(await result(page)).toHaveValue('8J-YgD8-');
  await show(page, 'Input');
  await page.getByRole('textbox', { name: 'Text to encode' }).fill('a');
  await expect(await result(page)).toHaveValue('YQ');
  await page.getByRole('switch', { name: 'Padding' }).click();
  await expect(await result(page)).toHaveValue('YQ==');
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
  await expect(await result(page)).toHaveValue('hello');
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
  await expect(await result(page)).toHaveValue(expected);
  await expect(
    page.getByRole('textbox', { name: 'Data URI', exact: true }),
  ).toHaveValue(`data:image/gif;base64,${expected}`);
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
  await show(page, 'Output');
  await expect(page.getByText('Image (PNG 1x1)')).toBeVisible();
  await expect(page.getByTestId('base64-preview')).toBeVisible();
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
  await show(page, 'Output');
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
  await show(page, 'Output');
  await expect(page.getByText(/Image \(GIF/)).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Decoded bytes' }),
  ).toBeVisible();
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
  // Opening a file is an explicit action: the Output pane comes up.
  await expect(page.getByRole('group', { name: 'Result panel' })).toBeVisible();
  await show(page, 'Input');
  await expect(page.getByText(/big\.bin \(2(\.0)? MB\)/)).toBeVisible();
  await show(page, 'Output');
  const download = page.waitForEvent('download');
  await page
    .getByRole('group', { name: 'Result panel' })
    .getByRole('button', { name: 'Download' })
    .click();
  const text = await readFile(await (await download).path(), 'utf8');
  expect(text).toBe(big.toString('base64'));
});

test('decodes a percent-encoded binary data URI', async ({ page }) => {
  await page.goto(pathOf('base64-converter'));
  await page.getByRole('radio', { name: 'Decode' }).click();
  await page
    .getByRole('textbox', { name: 'Base64 to decode' })
    .fill('data:application/octet-stream,%FF%00%01');
  await show(page, 'Output');
  await expect(page.getByText(/Binary data \(3 B/)).toBeVisible();
});
