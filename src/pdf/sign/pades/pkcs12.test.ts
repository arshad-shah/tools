import { describe, expect, it } from 'vitest';
import {
  FIXTURE_P12_PASSWORD,
  makeP12WithOpenssl,
  opensslAvailable,
} from '../../../../test/fixtures/signing';
import {
  importPkcs12,
  LEGACY_MESSAGE,
  NO_KEY_MESSAGE,
  WRONG_PASSWORD,
} from './pkcs12';

const sign = async (key: CryptoKey, alg: { name: string; hash: string }) =>
  crypto.subtle.sign(
    alg.name === 'ECDSA' ? { name: 'ECDSA', hash: alg.hash } : alg.name,
    key,
    new Uint8Array([1, 2, 3]),
  );

describe.skipIf(!opensslAvailable())(
  'importPkcs12 (openssl-made files)',
  () => {
    it('opens an AES-256 ECDSA file with the right password', async () => {
      const id = await importPkcs12(makeP12WithOpenssl(), FIXTURE_P12_PASSWORD);
      expect(id.info.subjectCN).toBe('Test Signer');
      expect(id.info.selfSigned).toBe(true);
      expect(id.chain).toHaveLength(0);
      expect(id.algorithm).toEqual({
        name: 'ECDSA',
        namedCurve: 'P-256',
        hash: 'SHA-256',
      });
      expect(id.privateKey.extractable).toBe(false);
      expect(id.privateKey.usages).toEqual(['sign']);
      expect(
        (await sign(id.privateKey, id.algorithm)).byteLength,
      ).toBeGreaterThan(0);
    });

    it('opens an RSA file with its CA certificate as the chain', async () => {
      const id = await importPkcs12(
        makeP12WithOpenssl({ key: 'rsa', withCa: true }),
        FIXTURE_P12_PASSWORD,
      );
      expect(id.algorithm.name).toBe('RSASSA-PKCS1-v1_5');
      expect(id.info.subjectCN).toBe('Test Signer');
      expect(id.info.issuerCN).toBe('Test Root CA');
      expect(id.info.keyDescription).toBe('RSA 2048');
      expect(id.chain).toHaveLength(1);
    });

    it('refuses a wrong password', async () => {
      await expect(
        importPkcs12(makeP12WithOpenssl(), 'not-the-password'),
      ).rejects.toMatchObject({
        code: 'CERTIFICATE_INVALID',
        message: WRONG_PASSWORD,
      });
    });

    it('refuses legacy 3DES/RC2 files with re-export instructions', async () => {
      await expect(
        importPkcs12(
          makeP12WithOpenssl({ legacy: true }),
          FIXTURE_P12_PASSWORD,
        ),
      ).rejects.toMatchObject({
        code: 'CERTIFICATE_INVALID',
        message: LEGACY_MESSAGE,
      });
    });

    it('refuses a file without a private key', async () => {
      await expect(
        importPkcs12(
          makeP12WithOpenssl({ certOnly: true }),
          FIXTURE_P12_PASSWORD,
        ),
      ).rejects.toMatchObject({
        code: 'CERTIFICATE_INVALID',
        message: NO_KEY_MESSAGE,
      });
    });
  },
);

describe('importPkcs12', () => {
  it('refuses bytes that are not a certificate file', async () => {
    await expect(
      importPkcs12(new Uint8Array([1, 2, 3, 4]), 'x'),
    ).rejects.toMatchObject({ code: 'CERTIFICATE_INVALID' });
  });
});
