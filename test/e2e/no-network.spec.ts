import { expect, test, type Page, type Request } from '@playwright/test';
import { pathOf, toolRoutes } from './tool-routes';

/*
 * No third-party requests (spec 12.3, plan H-2): every tool, opened and
 * exercised through its sample or generate action, only talks to this
 * origin (data: and blob: URLs never leave the page). Explicit exclusions:
 *   - HTTP Client: its job is to call other servers;
 *   - Markdown Editor: remote images are blocked until the per-document
 *     opt-in, asserted on its own below.
 */
const EXCLUDED = new Set(['api-request']);
const TOOLS = toolRoutes().filter((t) => t.enabled && !EXCLUDED.has(t.id));
const SAMPLE =
  /^(load sample|sample|samples|generate|generate many|try an example)$/i;

function thirdParty(page: Page, baseURL: string): { list: string[] } {
  const seen = { list: [] as string[] };
  const origin = new URL(baseURL).origin;
  page.on('request', (r: Request) => {
    const url = r.url();
    if (url.startsWith('data:') || url.startsWith('blob:')) return;
    if (new URL(url).origin !== origin) seen.list.push(url);
  });
  return seen;
}

for (const tool of TOOLS) {
  test(`${tool.id} makes no third-party requests`, async ({
    page,
    baseURL,
  }) => {
    const requests = thirdParty(page, baseURL!);
    await page.goto(tool.path);
    await expect(
      page.getByRole('heading', { level: 1, name: tool.name }),
    ).toBeVisible();
    await expect(
      page.getByText(`Loading ${tool.name}`, { exact: true }),
    ).toHaveCount(0, {
      timeout: 30_000,
    });
    // Exercise the tool: its sample (a menu picks the first) or generate.
    const action = page.getByRole('button', { name: SAMPLE }).first();
    if (await action.count()) {
      await action.click();
      const item = page.getByRole('menuitem').first();
      if (await item.isVisible().catch(() => false)) await item.click();
    }
    // Settle: the page loaded and the browser went idle (media elements
    // such as the Pomodoro sounds keep the network from ever going idle).
    await page.waitForLoadState('load');
    await page.evaluate(
      () => new Promise<void>((r) => requestIdleCallback(() => r())),
    );
    expect(requests.list).toEqual([]);
  });
}

test('markdown-editor loads remote images only after the opt-in', async ({
  page,
}) => {
  const fetched: string[] = [];
  await page.route('https://example.com/**', (route) => {
    fetched.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
    });
  });
  await page.goto(pathOf('markdown-editor'));
  await page
    .getByRole('textbox', { name: /^Markdown/ })
    .first()
    .fill('![a](https://example.com/a.svg)');
  const preview = page.getByRole('tab', { name: /^Preview/ });
  if (await preview.count()) await preview.click();
  await expect(page.getByText('1 remote image blocked')).toBeVisible();
  await page.evaluate(
    () => new Promise<void>((r) => requestIdleCallback(() => r())),
  );
  expect(fetched).toEqual([]);

  await page.getByRole('button', { name: 'Load for this document' }).click();
  await expect.poll(() => fetched.length).toBeGreaterThan(0);
  expect(fetched[0]).toBe('https://example.com/a.svg');
});
