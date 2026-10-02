import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';

const editor = (page: Page) =>
  page.getByRole('textbox', { name: 'Markdown', exact: true });
/** R41: Edit and Preview are tabs. */
const showPreview = (page: Page) =>
  page.getByRole('tab', { name: /^Preview/ }).click();

// A 1x1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

test('markdown-editor previews a heading and a table', async ({ page }) => {
  await page.goto(pathOf('markdown-editor'));
  await editor(page).fill('# Hello\n\n| a | b |\n| - | - |\n| 1 | 2 |\n');
  await showPreview(page);
  const frame = page.frameLocator('iframe[title="Preview"]');
  await expect(frame.locator('h1')).toHaveText('Hello');
  await expect(frame.locator('table')).toBeVisible();
});

test('markdown-editor blocks remote images until the opt-in', async ({
  page,
}) => {
  // Only requests that reach the network layer are routed: one the frame's
  // CSP refuses never gets here (Chromium still emits a failed `request`).
  const requests: string[] = [];
  await page.route('https://example.com/**', (route) => {
    requests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
  });
  await page.goto(pathOf('markdown-editor'));
  await editor(page).fill('![a](https://example.com/a.png)');
  await expect(page.getByText('1 remote image blocked')).toBeVisible();
  await showPreview(page);
  const frame = page.frameLocator('iframe[title="Preview"]');
  await expect(frame.locator('img')).toHaveCount(1);
  await page.waitForTimeout(500);
  expect(requests).toEqual([]);

  await page.getByRole('button', { name: 'Load for this document' }).click();
  await expect.poll(() => requests.length).toBeGreaterThan(0);
  expect(requests[0]).toBe('https://example.com/a.png');
});

test('markdown-editor never runs scripts from the document', async ({
  page,
}) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.type());
    void d.dismiss();
  });
  await page.goto(pathOf('markdown-editor'));
  await editor(page).fill(
    '<script>alert(1)</script>\n\n<img src=x onerror="alert(2)">\n\ndone',
  );
  await showPreview(page);
  const frame = page.frameLocator('iframe[title="Preview"]');
  await expect(frame.getByText('done')).toBeVisible();
  await page.waitForTimeout(500);
  expect(dialogs).toEqual([]);
});

test('markdown-editor downloads a standalone HTML file', async ({ page }) => {
  await page.goto(pathOf('markdown-editor'));
  await editor(page).fill('# Report\n\nBody text.');
  await page.getByRole('button', { name: 'Export' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'Download HTML' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('report.html');
  const html = await readFile((await download.path())!, 'utf8');
  expect(html.startsWith('<!doctype html>')).toBe(true);
  expect(html).toContain('<h1 id="report"');
});

test('markdown-editor outline scrolls the preview to the heading', async ({
  page,
}) => {
  const filler = Array.from({ length: 80 }, (_, i) => `Paragraph ${i}.`).join(
    '\n\n',
  );
  await page.goto(pathOf('markdown-editor'));
  await editor(page).fill(`# One\n\n${filler}\n\n## Two\n\n${filler}`);
  await showPreview(page);
  const frame = page.frameLocator('iframe[title="Preview"]');
  await expect(frame.locator('#two')).not.toBeInViewport();
  await page.getByRole('button', { name: 'Outline' }).click();
  await page.getByRole('button', { name: 'Two', exact: true }).click();
  await expect(frame.locator('#two')).toBeInViewport();
});
