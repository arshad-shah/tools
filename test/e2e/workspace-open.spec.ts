import { expect, test, type Page } from '@playwright/test';
import { AES_FIXTURE_USER_PASSWORD } from '../fixtures/builders';

/* Opening documents in the workspace (plan B-14, spec §12). */
const GEN = 'test/fixtures/generated';
const firstPage = (page: Page) =>
  page.locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]');

/** Document names in the workspace's IndexedDB. */
const savedNames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const open = indexedDB.open('tools-workspace');
        open.onsuccess = () => {
          const db = open.result;
          const get = db
            .transaction('documents', 'readonly')
            .objectStore('documents')
            .getAll();
          get.onsuccess = () => {
            resolve((get.result as { name: string }[]).map((d) => d.name));
            db.close();
          };
        };
        open.onerror = () => resolve([]);
      }),
  );

test('one PDF dropped on the PDF hub opens in the workspace', async ({
  page,
}) => {
  await page.goto('/pdf');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(`${GEN}/text-3.pdf`);
  await expect(page).toHaveURL(/\/pdf\/edit/);
  await expect(firstPage(page)).toBeAttached();
  await expect(
    page.getByRole('region', { name: 'Page 1 of 3' }),
  ).toBeAttached();
});

test('an encrypted PDF asks for its password and is not saved locally', async ({
  page,
}) => {
  await page.goto('/pdf/edit');
  await expect(
    page.getByRole('heading', { level: 1, name: 'PDF workspace' }),
  ).toBeVisible();
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(`${GEN}/encrypted-aes.pdf`);
  const password = page.getByLabel('Password for encrypted-aes.pdf', {
    exact: true,
  });
  await password.fill('wrong');
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(
    page.getByRole('alert').getByText('That password is not correct.'),
  ).toBeVisible();
  await password.fill(AES_FIXTURE_USER_PASSWORD);
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(firstPage(page)).toBeAttached();
  await expect(page.getByText('Not saved locally')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('doc')).toBeNull();
});

test('Home lists an edited document and restores it', async ({ page }) => {
  await page.goto('/pdf/edit');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(`${GEN}/text-3.pdf`);
  await expect(firstPage(page)).toBeAttached();
  const name = page.getByRole('textbox', { name: 'Document name' });
  await name.fill('Renamed fixture.pdf');
  await name.press('Enter');
  await expect(page).toHaveURL(/doc=/);
  // The rename reaches IndexedDB after the autosave debounce.
  await expect
    .poll(() => savedNames(page), { timeout: 10_000 })
    .toContain('Renamed fixture.pdf');
  await expect(page.getByText('Saved on this device')).toBeVisible();
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Recent documents' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Renamed fixture.pdf', exact: true })
    .click();
  await expect(page).toHaveURL(/\/pdf\/edit.*doc=/);
  await expect(firstPage(page)).toBeAttached();
  await expect(
    page.getByRole('textbox', { name: 'Document name' }),
  ).toHaveValue('Renamed fixture.pdf');
});
