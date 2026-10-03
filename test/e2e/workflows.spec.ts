import { expect, test, type Page } from '@playwright/test';
import { pathOf } from './tool-routes';

/*
 * The cross-tool hand-off matrix (spec 10, plan H-1): one test per row.
 * Each starts at the source tool, triggers the Send to action by its
 * accessible name and checks the target route and its filled state.
 */

const tab = (page: Page, name: string) =>
  page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();

const go = async (page: Page, id: string) => {
  await page.goto(pathOf(id));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
};

const atTool = (page: Page, id: string) =>
  expect(page).toHaveURL(new RegExp(`${pathOf(id)}(\\?|$)`));

// A small HS256-shaped token (not verified by these flows).
const b64url = (o: object) =>
  Buffer.from(JSON.stringify(o)).toString('base64url');
const TOKEN = [
  b64url({ alg: 'HS256', typ: 'JWT' }),
  b64url({ sub: 'workflow-user', exp: 1893456000 }),
  'c2lnbmF0dXJl',
].join('.');

const API = 'https://api.tools.test';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

test.describe('Mock Data', () => {
  test('Open in CSV Viewer', async ({ page }) => {
    await go(page, 'random-data-generator');
    await page.getByLabel('Rows').fill('5');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.getByRole('button', { name: 'Open in CSV Viewer' }).click();
    await atTool(page, 'csv-viewer');
    await expect(page.getByText('5 of 5 rows')).toBeVisible();
  });

  test('Open in JSON Viewer', async ({ page }) => {
    await go(page, 'random-data-generator');
    await page.getByLabel('Rows').fill('3');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.getByRole('button', { name: 'Open in JSON Viewer' }).click();
    await atTool(page, 'json-and-xml-viewer');
    await tab(page, 'Source');
    await expect(page.getByRole('textbox', { name: 'Document' })).toHaveValue(
      /^\[/,
    );
  });
});

test.describe('CSV Viewer', () => {
  const loadCsv = async (page: Page) => {
    await go(page, 'csv-viewer');
    await page
      .getByRole('textbox', { name: /CSV/ })
      .first()
      .fill('name,age\nAda,36\nGrace,85\n');
    await expect(page.getByText('2 of 2 rows')).toBeVisible();
  };

  test('Open as JSON in the JSON Viewer', async ({ page }) => {
    await loadCsv(page);
    await page.getByRole('button', { name: 'Send JSON to' }).click();
    await page.getByRole('menuitem', { name: /JSON & XML Viewer/ }).click();
    await atTool(page, 'json-and-xml-viewer');
    await tab(page, 'Source');
    await expect(page.getByRole('textbox', { name: 'Document' })).toHaveValue(
      /"Grace"/,
    );
  });

  test('Generate more like this in Mock Data', async ({ page }) => {
    await loadCsv(page);
    await page.getByRole('button', { name: 'Generate more like this' }).click();
    await atTool(page, 'random-data-generator');
    await expect(
      page.getByText('Schema received from another tool'),
    ).toBeVisible();
  });
});

test.describe('JSON Viewer', () => {
  const loadJson = async (page: Page) => {
    await go(page, 'json-and-xml-viewer');
    await tab(page, 'Source');
    await page
      .getByRole('textbox', { name: 'Document' })
      .fill('[{"name":"Ada","age":36},{"name":"Grace","age":85}]');
  };

  test('Open as table in the CSV Viewer', async ({ page }) => {
    await loadJson(page);
    await page.getByRole('button', { name: 'Send as CSV' }).click();
    await page.getByRole('menuitem', { name: /CSV Viewer/ }).click();
    await atTool(page, 'csv-viewer');
    await expect(page.getByText('2 of 2 rows')).toBeVisible();
  });

  test('Generate more like this in Mock Data', async ({ page }) => {
    await loadJson(page);
    await page.getByRole('button', { name: 'Send schema' }).click();
    await page.getByRole('menuitem', { name: /Mock Data/ }).click();
    await atTool(page, 'random-data-generator');
    await expect(
      page.getByText('Schema received from another tool'),
    ).toBeVisible();
  });
});

test('Formatter Show changes opens Text Diff with both sides', async ({
  page,
}) => {
  await go(page, 'code-formatter');
  await page.getByRole('textbox', { name: 'Input' }).fill('{"b":1,"a":[1,2]}');
  await page.getByRole('button', { name: 'Format', exact: true }).click();
  await page.getByRole('button', { name: 'Show changes' }).click();
  await atTool(page, 'text-diff-checker');
  await tab(page, 'Original');
  await expect(
    page.getByRole('textbox', { name: 'Original text' }),
  ).toHaveValue('{"b":1,"a":[1,2]}');
  await tab(page, 'Changed');
  await expect(page.getByRole('textbox', { name: 'Changed text' })).toHaveValue(
    /\n/,
  );
});

test.describe('Base64', () => {
  const decode = async (page: Page, text: string) => {
    await go(page, 'base64-converter');
    await page.getByRole('radio', { name: 'Decode' }).click();
    await tab(page, 'Input');
    await page
      .getByRole('textbox', { name: 'Base64 to decode' })
      .fill(Buffer.from(text).toString('base64'));
    await tab(page, 'Output');
  };

  test('Open in JSON Viewer', async ({ page }) => {
    await decode(page, '{"from":"base64"}');
    await page.getByRole('button', { name: 'Send to' }).click();
    await page.getByRole('menuitem', { name: /JSON & XML Viewer/ }).click();
    await atTool(page, 'json-and-xml-viewer');
    await tab(page, 'Source');
    await expect(page.getByRole('textbox', { name: 'Document' })).toHaveValue(
      /"base64"/,
    );
  });

  test('Open in JWT Decoder', async ({ page }) => {
    await decode(page, TOKEN);
    await page.getByRole('button', { name: 'Send to' }).click();
    await page.getByRole('menuitem', { name: /JWT/ }).click();
    await atTool(page, 'jwt-decode');
    await expect(page.getByText('workflow-user').first()).toBeVisible();
  });
});

test.describe('JWT', () => {
  const open = async (page: Page) => {
    await go(page, 'jwt-decode');
    await tab(page, 'Input');
    await page.getByRole('textbox', { name: 'JWT token' }).fill(TOKEN);
    await tab(page, 'Output');
  };

  test('Open payload in JSON Viewer', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Send payload to' }).click();
    await page.getByRole('menuitem', { name: /JSON & XML Viewer/ }).click();
    await atTool(page, 'json-and-xml-viewer');
    await tab(page, 'Source');
    await expect(page.getByRole('textbox', { name: 'Document' })).toHaveValue(
      /workflow-user/,
    );
  });

  test('Open exp in Epoch', async ({ page }) => {
    await open(page);
    await page
      .getByRole('button', { name: 'Open exp in Epoch Converter' })
      .click();
    await atTool(page, 'epoch-converter');
    await expect(page.getByRole('textbox').first()).toHaveValue('1893456000');
  });
});

test.describe('HTTP Client', () => {
  const respond = async (page: Page) => {
    await page.route(`${API}/**`, (route) =>
      route.request().method() === 'OPTIONS'
        ? route.fulfill({ status: 204, headers: CORS })
        : route.fulfill({
            status: 200,
            headers: CORS,
            json: { token: TOKEN, next: `${API}/page/2` },
          }),
    );
    await go(page, 'api-request');
    await page
      .getByRole('textbox', { name: 'Request URL' })
      .fill(`${API}/session`);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByRole('tab', { name: /^Response/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  };

  test('Open response in JSON Viewer', async ({ page }) => {
    await respond(page);
    await page.getByRole('button', { name: 'Open in JSON Viewer' }).click();
    await atTool(page, 'json-and-xml-viewer');
    await tab(page, 'Source');
    await expect(page.getByRole('textbox', { name: 'Document' })).toHaveValue(
      /"token"/,
    );
  });

  test('Decode token', async ({ page }) => {
    await respond(page);
    await page.getByRole('button', { name: 'Decode token' }).click();
    await atTool(page, 'jwt-decode');
    await expect(page.getByText('workflow-user').first()).toBeVisible();
  });

  test('Inspect URL', async ({ page }) => {
    await respond(page);
    await page.getByRole('button', { name: 'Inspect URL' }).click();
    await atTool(page, 'url-parser');
    await expect(
      page.getByRole('textbox', { name: /URL/ }).first(),
    ).toHaveValue(new RegExp(`^${API}`));
  });
});

test.describe('URL Inspector', () => {
  const inspect = async (page: Page) => {
    await go(page, 'url-parser');
    await page
      .getByRole('textbox', { name: /URL/ })
      .first()
      .fill('https://example.com/search?q=tools&page=2');
  };

  test('Send to HTTP Client', async ({ page }) => {
    await inspect(page);
    await page.getByRole('button', { name: 'Open in' }).click();
    await page.getByRole('menuitem', { name: 'HTTP Client' }).click();
    await atTool(page, 'api-request');
    await expect(
      page.getByRole('textbox', { name: 'Request URL' }),
    ).toHaveValue(/example\.com\/search/);
  });

  test('Make QR', async ({ page }) => {
    await inspect(page);
    await page.getByRole('button', { name: 'Open in' }).click();
    await page.getByRole('menuitem', { name: 'QR Code Generator' }).click();
    await atTool(page, 'qr-code-generator');
    await expect(
      page.getByText('https://example.com/search').first(),
    ).toBeAttached();
  });
});

test('Text Encoder opens a decoded URL in the URL Inspector', async ({
  page,
}) => {
  await go(page, 'url-encoder-decoder');
  await page.getByRole('radio', { name: 'Decode' }).click();
  await page
    .getByRole('textbox', { name: /Text to decode/ })
    .fill('https%3A%2F%2Fexample.com%2Fa%3Fb%3D1');
  await tab(page, 'Output');
  await page.getByRole('button', { name: 'Open URL in' }).click();
  await page.getByRole('menuitem', { name: /URL Inspector/ }).click();
  await atTool(page, 'url-parser');
  await expect(page.getByRole('textbox', { name: /URL/ }).first()).toHaveValue(
    'https://example.com/a?b=1',
  );
});

test('Regex Use as log format opens the Log Viewer format dialog', async ({
  page,
}) => {
  await go(page, 'regex-tester');
  await page
    .getByRole('textbox', { name: 'Regex pattern' })
    .fill('(?<level>[A-Z]+) (?<message>.*)');
  await page.getByRole('button', { name: 'Actions' }).click();
  await page.getByRole('menuitem', { name: 'Use as log format' }).click();
  await atTool(page, 'log-parser');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('Password Hash this', async ({ page }) => {
  await go(page, 'password-generator');
  await page.getByRole('button', { name: 'Hash this' }).click();
  await atTool(page, 'hash-generator');
  await tab(page, 'Input');
  await expect(page.getByRole('textbox').first()).not.toHaveValue('');
});

test('Password Use as passphrase in Text Encrypt', async ({ page }) => {
  await go(page, 'password-generator');
  await page
    .getByRole('button', { name: /Use as passphrase in Text Encrypt/ })
    .click();
  await atTool(page, 'text-encrypt');
  await expect(page.getByLabel('Passphrase', { exact: true })).not.toHaveValue(
    '',
  );
});

test('Password Use for PDF Protect fills the protect password', async ({
  page,
}) => {
  await go(page, 'password-generator');
  await page.getByRole('button', { name: /PDF Protect|Protect PDF/ }).click();
  await atTool(page, 'pdf-protect');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await expect(page.getByLabel('Password to open')).not.toHaveValue('');
});

test('Calculator Open in Number Base Converter', async ({ page }) => {
  await go(page, 'calculator');
  await page.getByRole('radio', { name: 'Programmer' }).click();
  const expr = page.getByRole('textbox', { name: 'Expression' });
  await expr.fill('255');
  await expr.press('Enter');
  await page
    .getByRole('button', { name: 'Open in Number Base Converter' })
    .click();
  await atTool(page, 'number-converter');
  // Kept-alive pages stay in the DOM (hidden): match the visible field.
  await expect(
    page.getByLabel('Decimal', { exact: true }).filter({ visible: true }),
  ).toHaveValue('255');
});

test('Color Use colours in QR', async ({ page }) => {
  await go(page, 'color-tester');
  // An extracted palette offers its colours to the QR Generator.
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles('test/fixtures/generated/photo.png');
  await page.getByRole('button', { name: 'Use colours in QR' }).click();
  await atTool(page, 'qr-code-generator');
  await tab(page, 'Style');
});

test('EXIF Send to Image Compressor', async ({ page }) => {
  await go(page, 'exif-tool');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles('test/fixtures/generated/exif-gps.jpg');
  await page.getByRole('button', { name: 'Send to Image Compressor' }).click();
  await atTool(page, 'image-optimizer');
  await expect(
    page.getByText('exif-gps').filter({ visible: true }).first(),
  ).toBeVisible();
});

test.describe('Image Compressor', () => {
  const compress = async (page: Page) => {
    await go(page, 'image-optimizer');
    await page
      .locator('input[type=file]')
      .first()
      .setInputFiles('test/fixtures/generated/photo.png');
    await page
      .getByRole('button', { name: 'Open in' })
      .click({ timeout: 30_000 });
  };

  for (const [item, target] of [
    ['Images to PDF', 'images-to-pdf'],
    ['Make a favicon', 'favicon-generator'],
    ['View EXIF of originals', 'exif-tool'],
    ['Extract palette', 'color-tester'],
  ] as const)
    test(`Open in ${item}`, async ({ page }) => {
      await compress(page);
      await page.getByRole('menuitem', { name: item }).click();
      await atTool(page, target);
    });
});

test('Mod+K Import cURL into HTTP Client from anywhere', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() =>
    navigator.clipboard.writeText(
      "curl -X POST https://api.tools.test/items -H 'Accept: application/json'",
    ),
  );
  await page.keyboard.press('ControlOrMeta+k');
  await page
    .getByRole('combobox', { name: 'Search commands' })
    .fill('import curl');
  await page
    .getByRole('option', { name: /Import cURL into HTTP Client/ })
    .click();
  await atTool(page, 'api-request');
  await expect(page.getByRole('textbox', { name: 'Request URL' })).toHaveValue(
    'https://api.tools.test/items',
  );
});

test('Mod+K lists Send result to commands for a hand-off source', async ({
  page,
}) => {
  await go(page, 'random-data-generator');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.keyboard.press('ControlOrMeta+k');
  await page
    .getByRole('combobox', { name: 'Search commands' })
    .fill('send result');
  await expect(
    page.getByRole('option', { name: /Send result to CSV Viewer/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('option', { name: /Send result to JSON & XML Viewer/ }),
  ).toBeVisible();
});

test('Log Viewer Compare selected opens Text Diff with both lines', async ({
  page,
}) => {
  await go(page, 'log-parser');
  await page
    .getByRole('textbox', { name: 'Log' })
    .fill(
      [
        '2024-01-15T08:23:45.123 [INFO] [svc] left-line',
        '2024-01-15T08:24:01.789 [WARN] [svc] right-line',
      ].join('\n'),
    );
  await tab(page, 'Output');
  await page.getByRole('checkbox', { name: 'Select line 1' }).check();
  await page.getByRole('checkbox', { name: 'Select line 2' }).check();
  await page.getByRole('button', { name: /^Compare selected/ }).click();
  await atTool(page, 'text-diff-checker');
  await tab(page, 'Original');
  await expect(
    page.getByRole('textbox', { name: 'Original text' }),
  ).toHaveValue(/left-line/);
  await tab(page, 'Changed');
  await expect(page.getByRole('textbox', { name: 'Changed text' })).toHaveValue(
    /right-line/,
  );
});

test.describe('QR Scanner', () => {
  const scan = async (page: Page) => {
    await go(page, 'qr-code-generator');
    await page
      .getByRole('textbox', { name: 'URL' })
      .fill('https://example.com/scanned');
    await page.getByRole('tab', { name: 'Export' }).click();
    await page.getByRole('combobox', { name: 'PNG size' }).selectOption('512');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PNG' }).click();
    const { readFile } = await import('node:fs/promises');
    const png = await readFile(await (await download).path());
    await page.goto(`${pathOf('qr-scanner')}?decoder=zxing`);
    await page
      .locator('input[type=file]')
      .setInputFiles({ name: 'qr.png', mimeType: 'image/png', buffer: png });
    await expect(
      page.getByText('https://example.com/scanned').first(),
    ).toBeVisible({ timeout: 20_000 });
  };

  test('Open in URL Inspector', async ({ page }) => {
    await scan(page);
    await page.getByRole('button', { name: 'Open in URL Inspector' }).click();
    await atTool(page, 'url-parser');
    await expect(
      page
        .getByRole('textbox', { name: /URL/ })
        .filter({ visible: true })
        .first(),
    ).toHaveValue('https://example.com/scanned');
  });

  test('Make QR', async ({ page }) => {
    await scan(page);
    await page.getByRole('button', { name: 'Open in' }).click();
    await page.getByRole('menuitem', { name: 'QR Code Generator' }).click();
    await atTool(page, 'qr-code-generator');
    // The generator remembers its last tab (Export, from making the code).
    await tab(page, 'Content');
    await expect(
      page.getByRole('textbox', { name: 'URL' }).filter({ visible: true }),
    ).toHaveValue('https://example.com/scanned');
  });
});
