import { expect, test } from '@playwright/test';

test('hash-generator computes HMAC only with the key the user enters', async ({
  page,
}) => {
  await page.goto('/hash-generator');
  await page.getByLabel('Text to hash').fill('what do ya want for nothing?');
  // No key yet: no HMAC is shown, only a prompt for one.
  await expect(page.getByTestId('hash-sha256')).toBeVisible();
  await expect(page.getByTestId('hash-hmac-sha256')).toHaveCount(0);
  await expect(
    page.getByText('Enter an HMAC secret key to compute HMAC values.'),
  ).toBeVisible();

  // RFC 4231 test case 2.
  await page.getByLabel('HMAC secret key').fill('Jefe');
  await expect(page.getByTestId('hash-hmac-sha256')).toHaveText(
    '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
  );
});

test('hash-generator offers FIPS 202 SHA3-256 and a labelled Keccak-256', async ({
  page,
}) => {
  await page.goto('/hash-generator');
  await page.getByLabel('Text to hash').fill('abc');
  await expect(page.getByTestId('hash-sha3-256')).toHaveText(
    '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532',
  );
  await expect(
    page.getByRole('heading', { name: 'Keccak-256 (Ethereum)' }),
  ).toBeVisible();
});

test('hash-generator can hash an empty message', async ({ page }) => {
  await page.goto('/hash-generator');
  await expect(page.getByTestId('hash-sha256')).toHaveCount(0);
  await page.getByRole('switch', { name: 'Hash an empty message' }).click();
  await expect(page.getByTestId('hash-sha256')).toHaveText(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  );
  // HMAC of the empty message once a key is set (RFC 4231 style check
  // against node:crypto: HMAC-SHA256("key", "")).
  await page.getByLabel('HMAC secret key').fill('key');
  await expect(page.getByTestId('hash-hmac-sha256')).toHaveText(
    '5d5d139563c95b5967b9bd9a8c9b233a9dedb45072794cd232dc1b74832607d0',
  );
});
