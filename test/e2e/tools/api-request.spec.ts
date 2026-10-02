import { expect, test, type Page, type Route } from '@playwright/test';
import { pathOf } from '../tool-routes';

const API = 'https://api.tools.test';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

async function mock(
  page: Page,
  path: string,
  handler: (route: Route) => Promise<void>,
) {
  await page.route(`${API}${path}`, async (route) => {
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: CORS });
    return handler(route);
  });
}

const urlBox = (page: Page) =>
  page.getByRole('textbox', { name: 'Request URL' });
const send = (page: Page) =>
  page.getByRole('button', { name: 'Send', exact: true }).click();

test('GET with params shows a 200 JSON tree', async ({ page }) => {
  let seen = '';
  await mock(page, '/items?**', async (route) => {
    seen = route.request().url();
    await route.fulfill({
      status: 200,
      headers: CORS,
      json: { items: [{ id: 1, name: 'Widget' }] },
    });
  });
  await page.goto(pathOf('api-request'));
  await urlBox(page).fill(`${API}/items`);
  const params = page
    .getByRole('table', { name: 'Query parameters' })
    .locator('..');
  await page.getByRole('button', { name: 'Add row' }).first().click();
  await page.getByRole('textbox', { name: 'Key, row 1' }).fill('q');
  await page.getByRole('textbox', { name: 'Value, row 1' }).fill('a b');
  await expect(params).toBeVisible();
  await send(page);
  // Sending shows the Response pane (one pane at a time, R41).
  await expect(page.getByRole('tab', { name: 'Response' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText('200 OK')).toBeVisible();
  expect(seen).toBe(`${API}/items?q=a+b`);
  await expect(page.getByRole('tree', { name: 'Response JSON' })).toBeVisible();
  await page.getByRole('tab', { name: 'Request', exact: true }).click();
  await expect(urlBox(page)).toBeVisible();
});

test('POST form-data reaches the server with both parts', async ({ page }) => {
  let body = '';
  let type = '';
  await mock(page, '/upload', async (route) => {
    body = route.request().postData() ?? '';
    type = route.request().headers()['content-type'] ?? '';
    await route.fulfill({ status: 201, headers: CORS, body: 'ok' });
  });
  await page.goto(pathOf('api-request'));
  await page.getByRole('combobox', { name: 'Method' }).selectOption('POST');
  await urlBox(page).fill(`${API}/upload`);
  await page.getByRole('tab', { name: 'Body' }).click();
  await page.getByRole('radio', { name: 'Form data' }).click();
  await page.getByRole('button', { name: 'Add row' }).click();
  await page.getByRole('textbox', { name: 'Field, row 1' }).fill('name');
  await page.getByRole('textbox', { name: 'Value, row 1' }).fill('Ada');
  await page.getByRole('button', { name: 'Add row' }).click();
  await page.getByRole('textbox', { name: 'Field, row 2' }).fill('doc');
  await page
    .getByRole('combobox', { name: /Type of/ })
    .nth(1)
    .selectOption('file');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose file for doc' }).click();
  await (
    await chooser
  ).setFiles({
    name: 'note.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('file body'),
  });
  await send(page);
  await expect(page.getByText('201 Created')).toBeVisible();
  expect(type).toMatch(/^multipart\/form-data; boundary=/);
  expect(body).toContain('name="name"');
  expect(body).toContain('Ada');
  expect(body).toContain('filename="note.txt"');
  expect(body).toContain('file body');
});

test('a 204 empty body shows 204, not 0', async ({ page }) => {
  await mock(page, '/empty', (route) =>
    route.fulfill({
      status: 204,
      headers: { ...CORS, 'content-type': 'application/json' },
    }),
  );
  await page.goto(pathOf('api-request'));
  await urlBox(page).fill(`${API}/empty`);
  await send(page);
  await expect(page.getByText('204 No Content')).toBeVisible();
});

test('a blocked request shows the CORS explainer', async ({ page }) => {
  await page.route(`${API}/blocked`, (route) => route.abort('failed'));
  await page.goto(pathOf('api-request'));
  await urlBox(page).fill(`${API}/blocked`);
  await send(page);
  await expect(
    page.getByText('The browser blocked or could not reach this URL'),
  ).toBeVisible();
  await expect(
    page.getByText(/Access-Control-Allow-Origin/).first(),
  ).toBeVisible();
});

test('pasting a cURL command fills the request', async ({ page }) => {
  await page.goto(pathOf('api-request'));
  await urlBox(page).fill(
    `curl -X PUT '${API}/things/1' -H 'X-Trace: abc' -H 'Content-Type: application/json' -d '{"a":1}'`,
  );
  await expect(page.getByText('Imported from cURL')).toBeVisible();
  await expect(urlBox(page)).toHaveValue(`${API}/things/1`);
  await expect(page.getByRole('combobox', { name: 'Method' })).toHaveValue(
    'PUT',
  );
  await page.getByRole('tab', { name: /Headers/ }).click();
  await expect(
    page.getByRole('textbox', { name: 'Header, row 1' }),
  ).toHaveValue('X-Trace');
});

test('opens the response in the JSON Viewer', async ({ page }) => {
  await mock(page, '/doc', (route) =>
    route.fulfill({ status: 200, headers: CORS, json: { hello: 'world' } }),
  );
  await page.goto(pathOf('api-request'));
  await urlBox(page).fill(`${API}/doc`);
  await send(page);
  await page.getByRole('button', { name: 'Open in JSON Viewer' }).click();
  await expect(page).toHaveURL(new RegExp(`${pathOf('json-and-xml-viewer')}`));
  await expect(page.getByRole('textbox', { name: 'Document' })).toHaveValue(
    /"world"/,
  );
});

test('keeps collections saved under the legacy key', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('kit:store:tool:api-request')) return;
    localStorage.setItem(
      'apiTesterCollections',
      JSON.stringify([
        {
          id: 'c1',
          type: 'folder',
          name: 'Legacy Collection',
          children: [
            {
              id: 'r1',
              type: 'request',
              name: 'Legacy Request',
              method: 'GET',
              url: 'https://example.com',
            },
          ],
        },
      ]),
    );
  });
  await page.goto(pathOf('api-request'));
  await expect(page.getByText('Legacy Collection')).toBeVisible();
  await page.getByText('Legacy Request').click();
  await expect(urlBox(page)).toHaveValue('https://example.com');
  await page.reload();
  await expect(page.getByText('Legacy Collection')).toBeVisible();
});

test('the old /web/api-request route is gone and search finds HTTP Client', async ({
  page,
}) => {
  await page.goto('/web/api-request');
  await expect(page.getByText('No page at')).toBeVisible();
  await page
    .getByRole('searchbox', { name: 'Search tools' })
    .fill('api request');
  await expect(
    page
      .getByRole('region', { name: 'Search results' })
      .getByText('HTTP Client'),
  ).toBeVisible();
});
