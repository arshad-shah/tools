import { createHmac } from 'node:crypto';
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
