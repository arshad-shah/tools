import { createHmac, generateKeyPairSync } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const part = (v: unknown) =>
  Buffer.from(JSON.stringify(v)).toString('base64url');

function hs256(payload: unknown, secret: string): string {
  const input = `${part({ alg: 'HS256', typ: 'JWT' })}.${part(payload)}`;
  const sig = createHmac('sha256', secret).update(input).digest('base64url');
  return `${input}.${sig}`;
}

async function waitForSample(page: Page) {
  // The tool loads a sample token shortly after mount; let it land first.
  await expect(
    page.getByRole('textbox', { name: 'JWT token' }),
  ).not.toHaveValue('');
}

const future = Math.floor(Date.now() / 1000) + 3600;

test('jwt-decode never calls a token valid without checking the signature', async ({
  page,
}) => {
  await page.goto('/jwt-decode');
  await waitForSample(page);
  await page
    .getByRole('textbox', { name: 'JWT token' })
    .fill(hs256({ sub: '1', exp: future }, 'k'));
  await expect(page.getByText('Signature not verified')).toBeVisible();
  await expect(page.getByText('Within validity window')).toBeVisible();
  await expect(page.getByText('Token valid')).toHaveCount(0);
});

test('jwt-decode decodes non-ASCII claims as UTF-8', async ({ page }) => {
  await page.goto('/jwt-decode');
  await waitForSample(page);
  await page
    .getByRole('textbox', { name: 'JWT token' })
    .fill(hs256({ name: 'Zoë 東京' }, 'k'));
  await expect(page.getByText('"Zoë 東京"').first()).toBeVisible();
});

test('jwt-decode verifies an HS256 signature with the secret', async ({
  page,
}) => {
  await page.goto('/jwt-decode');
  await waitForSample(page);
  await page
    .getByRole('textbox', { name: 'JWT token' })
    .fill(hs256({ sub: '1' }, 'right secret'));
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

test('jwt-decode refuses a public key for an HS256 token (algorithm confusion)', async ({
  page,
}) => {
  const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  await page.goto('/jwt-decode');
  await waitForSample(page);
  // Forged: HS256 signed with the issuer's public key text as the secret.
  await page
    .getByRole('textbox', { name: 'JWT token' })
    .fill(hs256({ admin: true }, pem));
  await page.getByRole('tab', { name: 'Signature' }).click();

  for (const type of ['pem', 'secret']) {
    await page.getByLabel('Key type').selectOption(type);
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

test('jwt-decode reports an alg none token as unsigned', async ({ page }) => {
  await page.goto('/jwt-decode');
  await waitForSample(page);
  await page
    .getByRole('textbox', { name: 'JWT token' })
    .fill(`${part({ alg: 'none' })}.${part({ sub: '1' })}.`);
  await expect(page.getByText('Unsigned token (alg: none)')).toBeVisible();
  await page.getByRole('tab', { name: 'Signature' }).click();
  await expect(
    page.getByRole('button', { name: 'Verify signature' }),
  ).toHaveCount(0);
});

test('jwt-decode applies clock skew and checks iat', async ({ page }) => {
  const now = Math.floor(Date.now() / 1000);
  await page.goto('/jwt-decode');
  await waitForSample(page);
  const box = page.getByRole('textbox', { name: 'JWT token' });

  await box.fill(hs256({ exp: now - 30 }, 'k'));
  await expect(
    page.getByText('Expired', { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel('Clock skew (seconds)').fill('120');
  await expect(page.getByText('Within validity window')).toBeVisible();

  await page.getByLabel('Clock skew (seconds)').fill('0');
  await box.fill(hs256({ iat: now + 600 }, 'k'));
  await expect(page.getByText('Issued in the future')).toBeVisible();
});
