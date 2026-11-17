import { expect, type Page } from '@playwright/test';

/** The NotFound page for `path`: its heading, and the path it names. */
export async function expectNotFound(page: Page, path: string) {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'This page does not exist',
  );
  await expect(page.getByText(`There is no page at ${path}.`)).toBeVisible();
}
