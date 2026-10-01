import { expect, test } from '@playwright/test';

const MESSAGE =
  'This PDF is password-protected. Encrypted files are not supported by this tool yet.';

for (const route of [
  '/pdf-merger',
  '/pdf-splitter',
  '/pdf-organize',
  '/pdf-to-images',
  '/pdf-to-text',
  '/pdf-compressor',
]) {
  test(`${route} rejects a real AES-256 encrypted PDF as ENCRYPTED`, async ({
    page,
  }) => {
    await page.goto(route);
    await page
      .locator('input[type=file]')
      .first()
      .setInputFiles('test/fixtures/generated/encrypted-aes.pdf');
    await expect(page.getByRole('alert').getByText(MESSAGE)).toBeVisible();
  });
}
