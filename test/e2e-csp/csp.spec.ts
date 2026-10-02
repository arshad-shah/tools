import { expect, test, type Page } from '@playwright/test';
import { CSP } from '../../scripts/csp';
import { pathOf, toolRoutes } from '../e2e/tool-routes';

/*
 * Every route runs under the deployed Content-Security-Policy (plan F-2):
 * no securitypolicyviolation event and no console error naming the policy.
 */
declare global {
  interface Window {
    __csp: string[];
  }
}

const CATEGORIES = [
  'pdf',
  'text',
  'data',
  'encoding',
  'web',
  'media',
  'security',
  'math',
  'time',
];

const tools = toolRoutes().filter((t) => t.enabled);
const routes = [
  '/',
  ...CATEGORIES.map((c) => `/${c}`),
  ...tools.map((t) => t.path),
];

/** Collects violations from the first script on, plus console errors. */
async function watchPolicy(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  const console: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && m.text().includes('Content Security Policy'))
      console.push(m.text());
  });
  return async () => [...(await page.evaluate(() => window.__csp)), ...console];
}

test('the preview server sends the policy', async ({ request }) => {
  const res = await request.get('/');
  expect(res.headers()['content-security-policy']).toBe(CSP);
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
});

for (const route of routes) {
  test(`no CSP violation on ${route}`, async ({ page }) => {
    const violations = await watchPolicy(page);
    await page.goto(route, { waitUntil: 'networkidle' });
    await expect(page.locator('#root')).not.toBeEmpty();
    // Lazy tool chunks finish loading before the check.
    await expect(page.getByText(/^Loading /)).toHaveCount(0);
    expect(await violations()).toEqual([]);
  });
}

test('the workspace renders an open document under the policy', async ({
  page,
}) => {
  const violations = await watchPolicy(page);
  await page.goto('/pdf/edit');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await expect(
    page.locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]'),
  ).toBeAttached();
  expect(await violations()).toEqual([]);
});

test('the calculator plots under the policy (Plotly)', async ({ page }) => {
  const violations = await watchPolicy(page);
  await page.goto(pathOf('calculator'));
  await page.getByRole('tab', { name: 'Expression' }).click();
  await page.getByRole('textbox', { name: 'Expression' }).fill('exp(x)');
  await page.getByRole('button', { name: 'Plot expression' }).click();
  await expect(page.getByText(/f\(x\) = exp\(x\)/).first()).toBeVisible();
  await expect(page.locator('.main-svg').first()).toBeVisible();
  expect(await violations()).toEqual([]);
});

test('a PDF tool renders pages under the policy (pdf.js worker and wasm)', async ({
  page,
}) => {
  const violations = await watchPolicy(page);
  await page.goto(pathOf('pdf-splitter'));
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await expect(
    page.locator('canvas[data-rendered="true"]').first(),
  ).toBeAttached();
  expect(await violations()).toEqual([]);
});
