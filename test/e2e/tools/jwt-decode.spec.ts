import { createHmac, createSign, generateKeyPairSync } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';

const part = (v: unknown) =>
  Buffer.from(JSON.stringify(v)).toString('base64url');

function hs256(payload: unknown, secret: string): string {
  const input = `${part({ alg: 'HS256', typ: 'JWT' })}.${part(payload)}`;
  const sig = createHmac('sha256', secret).update(input).digest('base64url');
  return `${input}.${sig}`;
}

/** R41 tabs: shows a pane by its tab. */
const show = (page: Page, name: 'Input' | 'Output') =>
  page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();

async function waitForSample(page: Page) {
  // The tool loads a sample token shortly after mount and opens on the
  // decoded view (the Output pane); let it land first.
  await expect(page.getByRole('button', { name: 'Raw JSON' })).toBeVisible();
}

/** Types a token in the Input pane, then shows the decoded Output pane. */
async function fillToken(page: Page, token: string) {
  await show(page, 'Input');
  await page.getByRole('textbox', { name: 'JWT token' }).fill(token);
  await show(page, 'Output');
}

const future = Math.floor(Date.now() / 1000) + 3600;

test('never calls a token valid without checking the signature', async ({
  page,
}) => {
  await page.goto(pathOf('jwt-decode'));
  await waitForSample(page);
  await fillToken(page, hs256({ sub: '1', exp: future }, 'k'));
  await expect(page.getByText('Signature not verified')).toBeVisible();
  await expect(page.getByText('Within validity window')).toBeVisible();
  await expect(page.getByText('Token valid')).toHaveCount(0);
});

test('decodes non-ASCII claims as UTF-8', async ({ page }) => {
  await page.goto(pathOf('jwt-decode'));
  await waitForSample(page);
  await fillToken(page, hs256({ name: 'Zoë 東京' }, 'k'));
  await expect(page.getByText('"Zoë 東京"').first()).toBeVisible();
});

test('verifies an HS256 signature with the secret', async ({ page }) => {
  await page.goto(pathOf('jwt-decode'));
  await waitForSample(page);
  await fillToken(page, hs256({ sub: '1' }, 'right secret'));
  await page.getByRole('tab', { name: 'Signature' }).click();

  const key = page.getByLabel('Secret or public key');
  await key.fill('wrong secret');
  await page.getByRole('button', { name: 'Verify signature' }).click();
  await expect(page.getByText('Signature invalid')).toBeVisible();

  await key.fill('right secret');
  await page.getByRole('button', { name: 'Verify signature' }).click();
  await expect(page.getByText('Signature verified')).toBeVisible();

  // Editing the key again drops the stale result.
  await key.fill('right secret!');
  await expect(page.getByText('Signature not verified')).toBeVisible();
});

test('refuses a public key for an HS256 token (algorithm confusion)', async ({
  page,
}) => {
  const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  await page.goto(pathOf('jwt-decode'));
  await waitForSample(page);
  // Forged: HS256 signed with the issuer's public key text as the secret.
  await fillToken(page, hs256({ admin: true }, pem));
  await page.getByRole('tab', { name: 'Signature' }).click();

  for (const type of ['pem', 'secret']) {
    await page
      .getByRole('radio', {
        name: type === 'pem' ? 'PEM public key' : 'Shared secret',
      })
      .click();
    await page.getByLabel('Secret or public key').fill(pem);
    await page.getByRole('button', { name: 'Verify signature' }).click();
    await expect(
      page.getByText('Signature could not be checked'),
    ).toBeVisible();
    await expect(
      page.getByText(/HS256 needs a shared secret/).first(),
    ).toBeVisible();
    await expect(page.getByText('Signature verified')).toHaveCount(0);
  }
});

test('reports an alg none token as unsigned', async ({ page }) => {
  await page.goto(pathOf('jwt-decode'));
  await waitForSample(page);
  await fillToken(page, `${part({ alg: 'none' })}.${part({ sub: '1' })}.`);
  await expect(page.getByText('Unsigned token (alg: none)')).toBeVisible();
  await page.getByRole('tab', { name: 'Signature' }).click();
  await expect(
    page.getByRole('button', { name: 'Verify signature' }),
  ).toHaveCount(0);
});

test('applies clock skew and checks iat', async ({ page }) => {
  const now = Math.floor(Date.now() / 1000);
  await page.goto(pathOf('jwt-decode'));
  await waitForSample(page);
  await fillToken(page, hs256({ exp: now - 30 }, 'k'));
  await expect(
    page.getByText('Expired', { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel('Clock skew').selectOption('120');
  await expect(page.getByText('Within validity window')).toBeVisible();

  await page.getByLabel('Clock skew').selectOption('0');
  await fillToken(page, hs256({ iat: now + 600 }, 'k'));
  await expect(page.getByText('Issued in the future')).toBeVisible();
});

test('a builder-signed ES256 token verifies in the decoder', async ({
  page,
}) => {
  await page.goto(pathOf('jwt-decode'));
  await page.getByRole('tab', { name: 'Build and sign' }).click();
  await page.getByLabel('Algorithm').selectOption('ES256');
  await page.getByRole('button', { name: 'Generate key pair' }).click();
  const pem = page.getByRole('textbox', { name: 'Public key (PEM)' });
  await expect(pem).toHaveValue(/BEGIN PUBLIC KEY/);
  const publicPem = await pem.inputValue();
  await show(page, 'Output');
  const signed = page.getByRole('textbox', { name: 'Signed token' });
  await expect(signed).toHaveValue(/^ey/);
  await page.getByRole('button', { name: 'Open in decoder' }).click();
  await page.getByRole('tab', { name: 'Signature' }).click();
  await page.getByRole('radio', { name: 'PEM public key' }).click();
  await page.getByLabel('Secret or public key').fill(publicPem);
  await page.getByRole('button', { name: 'Verify signature' }).click();
  await expect(page.getByText('Signature verified')).toBeVisible();
});

test('the countdown is live', async ({ page }) => {
  await page.goto(pathOf('jwt-decode'));
  await waitForSample(page);
  const exp = Math.floor(Date.now() / 1000) + 600;
  await fillToken(page, hs256({ exp }, 'k'));
  const text = page.getByText(/expires in \d+ min \d+ s/);
  const first = await text.textContent();
  await page.waitForTimeout(2100);
  await expect(text).not.toHaveText(first ?? '');
});

test('the JWKS picker chooses a key when the token has no kid', async ({
  page,
}) => {
  const keys = [0, 1].map(() =>
    generateKeyPairSync('ec', { namedCurve: 'P-256' }),
  );
  const input = `${part({ alg: 'ES256' })}.${part({ sub: 'jwks' })}`;
  const sig = createSign('SHA256')
    .update(input)
    .sign({ key: keys[1].privateKey, dsaEncoding: 'ieee-p1363' })
    .toString('base64url');
  const jwks = JSON.stringify({
    keys: keys.map((k, i) => ({
      ...k.publicKey.export({ format: 'jwk' }),
      kid: `k${i}`,
      alg: 'ES256',
    })),
  });
  await page.goto(pathOf('jwt-decode'));
  await waitForSample(page);
  await fillToken(page, `${input}.${sig}`);
  await page.getByRole('tab', { name: 'Signature' }).click();
  await page.getByRole('radio', { name: 'JWK or JWKS' }).click();
  await page.getByLabel('Secret or public key').fill(jwks);
  await page
    .getByLabel('Key from the set')
    .selectOption({ label: 'EC (kid k1, ES256)' });
  await page.getByRole('button', { name: 'Verify signature' }).click();
  await expect(page.getByText('Signature verified')).toBeVisible();
});

test('copies the signature value from its read-only panel', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(pathOf('jwt-decode'));
  await waitForSample(page);
  await page.getByRole('tab', { name: 'Signature' }).click();
  await page.getByRole('button', { name: 'Signature value' }).click();
  const panel = page.getByRole('group', {
    name: 'Base64-encoded signature panel',
  });
  const value = await panel.getByRole('textbox').inputValue();
  await panel.getByRole('button', { name: 'Copy', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(value);
});

test('Compare payloads in Text Diff fills both sides of the diff', async ({
  page,
}) => {
  await page.goto(pathOf('jwt-decode'));
  await waitForSample(page);
  await fillToken(page, hs256({ sub: 'left-side' }, 'k'));
  await page
    .getByRole('button', { name: 'Compare with another token' })
    .click();
  await page
    .getByRole('textbox', { name: 'Token to compare' })
    .fill(hs256({ sub: 'right-side' }, 'k'));
  await page
    .getByRole('button', { name: 'Compare payloads in Text Diff' })
    .click();
  await expect(page).toHaveURL(new RegExp(pathOf('text-diff-checker')));
  await page.getByRole('tab', { name: /^Original/ }).click();
  await expect(
    page.getByRole('textbox', { name: 'Original text' }),
  ).toHaveValue(/left-side/);
  await page.getByRole('tab', { name: /^Changed/ }).click();
  await expect(page.getByRole('textbox', { name: 'Changed text' })).toHaveValue(
    /right-side/,
  );
});

test('Open exp in Epoch Converter hands over the seconds', async ({ page }) => {
  await page.goto(pathOf('jwt-decode'));
  await waitForSample(page);
  await fillToken(page, hs256({ exp: 1700000000 }, 'k'));
  await page
    .getByRole('button', { name: 'Open exp in Epoch Converter' })
    .click();
  await expect(page).toHaveURL(new RegExp(pathOf('epoch-converter')));
  await expect(page.locator('#epoch-input')).toHaveValue('1700000000');
});

test('accordion triggers have accessible names', async ({ page }) => {
  await page.goto(pathOf('jwt-decode'));
  await waitForSample(page);
  for (const name of [
    'Identity claims',
    'Access & permissions',
    'Timestamps',
    'Issuer information',
    'Custom claims',
    'Raw JSON',
  ]) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }
  // A <button> may only hold phrasing content (no <div>/<p>).
  await expect(page.locator('main button :is(div, p)')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Signature' }).click();
  await expect(page.locator('main button :is(div, p)')).toHaveCount(0);
});
