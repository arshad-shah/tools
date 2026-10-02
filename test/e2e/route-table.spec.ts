import { expect, test } from '@playwright/test';
import { toolRoutes } from './tool-routes';

/**
 * Route table (spec §15), generated from the registry: every enabled tool is
 * reachable from Home through its category hub and lives at its own path.
 */

/** Mirrors src/app/categories.ts (it imports icons Node cannot load). */
const CATEGORY_LABELS: Record<string, string> = {
  pdf: 'PDF',
  text: 'Text',
  data: 'Data',
  encoding: 'Encoding',
  web: 'Web & dev',
  media: 'Media',
  security: 'Security',
  math: 'Math',
  time: 'Time',
};

const ENABLED = toolRoutes().filter((t) => t.enabled);

function labelOf(category: string): string {
  const label = CATEGORY_LABELS[category];
  if (!label) throw new Error(`No label for category ${category}`);
  return label;
}

for (const [id, label] of Object.entries(CATEGORY_LABELS)) {
  test(`hub /${id} is titled ${label}`, async ({ page }) => {
    await page.goto(`/${id}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(label);
    expect(new URL(page.url()).pathname).toBe(`/${id}`);
  });
}

test('/pdf/edit is not a route yet', async ({ page }) => {
  await page.goto('/pdf/edit');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'No page at /pdf/edit',
  );
  expect(new URL(page.url()).pathname).toBe('/pdf/edit');
});

for (const tool of ENABLED) {
  test(`${tool.id}: Home, ${tool.category} hub, ${tool.path}`, async ({
    page,
  }) => {
    const label = labelOf(tool.category);
    await page.goto('/');
    await page
      .getByRole('region', { name: 'Categories' })
      .getByRole('link', { name: label, exact: true })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(label);
    expect(new URL(page.url()).pathname).toBe(`/${tool.category}`);

    await page
      .getByRole('main')
      .getByRole('link', { name: tool.name, exact: true })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(tool.name);
    expect(new URL(page.url()).pathname).toBe(tool.path);
  });
}
