import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';

const LOG = [
  '2024-01-15T08:23:45.123 [INFO] [com.example.UserService] User signed in - userId=12345',
  '2024-01-15T08:24:01.789 [ERROR] [com.example.DatabaseService] Failed to connect - java.sql.SQLException: Connection refused',
  'java.sql.SQLException: Connection refused',
  '\tat com.example.DatabaseService.connect(DatabaseService.java:42)',
  '\tat com.example.DatabaseService.init(DatabaseService.java:17)',
  'Caused by: java.net.ConnectException: Connection refused',
  '\t... 2 more',
  '2024-01-15T08:24:05.234 [WARN] [com.example.CacheService] Cache miss for key: prefs',
  '2024-01-15T08:24:10.567 [INFO] [com.example.StartupManager] Started in 3.45 seconds',
].join('\n');

async function pasteLog(page: Page) {
  await page.goto(pathOf('log-parser'));
  await page.getByRole('textbox', { name: 'Log' }).fill(LOG);
  await expect(page.getByText('4 of 4 entries')).toBeVisible();
}

test('log viewer groups a Java stack trace into one entry', async ({
  page,
}) => {
  await pasteLog(page);
  const log = page.getByRole('log', { name: 'Log entries' });
  await expect(log.getByRole('article')).toHaveCount(4);
  const error = log.getByRole('article', { name: 'Line 2' });
  await expect(error).toContainText('Failed to connect');
  await error.getByRole('button', { name: 'Expand line 2' }).click();
  await expect(
    error.getByRole('textbox', { name: 'Line 2 message' }),
  ).toContainText('DatabaseService.java:42');
});

test('log viewer filters by level', async ({ page }) => {
  await pasteLog(page);
  await page.getByRole('button', { name: /^Error/ }).click();
  await expect(page.getByText('1 of 4 entries')).toBeVisible();
  const log = page.getByRole('log', { name: 'Log entries' });
  await expect(log.getByRole('article')).toHaveCount(1);
  await page.getByRole('button', { name: /^Error/ }).click();
  await expect(page.getByText('4 of 4 entries')).toBeVisible();
});

test('log viewer exports CSV', async ({ page }) => {
  await pasteLog(page);
  await page.getByRole('button', { name: 'Export' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'Export as CSV' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('log-export.csv');
  const csv = readFileSync((await download.path())!, 'utf8');
  expect(csv.split(/\r?\n/)[0]).toBe(
    'line,time,level,component,message,fields',
  );
  expect(csv).toContain('DatabaseService.java:42');
});

test('log viewer uses a format handed off from the Regex Tester', async () => {
  test.skip(
    true,
    'The Regex Tester "Use as log format" UI is being rebuilt; the hand-off is covered by the Log Viewer component test',
  );
});

test('log viewer streams a large file with progress', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(pathOf('log-parser'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/large.log');
  await expect(page.getByText(/Parsing [\d.]+ [KMG]?B of/)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/^[\d,]+ of [\d,]+ entries$/)).toBeVisible({
    timeout: 55_000,
  });
  // The file is streamed to the worker, never read into the editor.
  await expect(page.getByRole('textbox', { name: 'Log' })).not.toContainText(
    'worker-0',
  );
});
