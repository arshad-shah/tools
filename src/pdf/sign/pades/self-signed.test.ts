import * as pkijs from 'pkijs';
import { describe, expect, it } from 'vitest';
import {
  opensslAcceptsP12,
  opensslAvailable,
} from '../../../../test/fixtures/signing';
import { importPkcs12 } from './pkcs12';
import { createSelfSigned, exportPkcs12 } from './self-signed';

const DAY = 86_400_000;
const PW = ['round', 'trip', 'pw'].join('-');

describe('createSelfSigned', () => {
  it('makes a one-year self-signed ECDSA certificate that verifies', async () => {
    const id = await createSelfSigned({
      name: 'Jane Doe',
      email: 'jane@example.com',
      organisation: 'Example',
      years: 1,
      keyType: 'ecdsa-p256',
    });
    expect(id.info.selfSigned).toBe(true);
    expect(id.info.subjectCN).toBe('Jane Doe');
    expect(id.info.subject).toBe('CN=Jane Doe, O=Example, E=jane@example.com');
    const span = id.info.notAfter.getTime() - id.info.notBefore.getTime();
    expect(span).toBeGreaterThan(364 * DAY);
    expect(span).toBeLessThan(367 * DAY);
    expect(id.privateKey.extractable).toBe(false);
    expect(await id.certificate.verify()).toBe(true);
    const data = new Uint8Array([9, 8, 7]);
    const sig = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      id.privateKey,
      data,
    );
    const pub = await id.certificate.getPublicKey();
    expect(
      await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        pub,
        sig,
        data,
      ),
    ).toBe(true);
    const ku = id.certificate.extensions!.find(
      (e) => e.extnID === '2.5.29.15',
    )!;
    expect(ku.critical).toBe(true);
    const bc = id.certificate.extensions!.find(
      (e) => e.extnID === '2.5.29.19',
    )!;
    expect((bc.parsedValue as pkijs.BasicConstraints).cA).toBe(false);
  });

  it('makes RSA 2048 certificates valid for 3 years', async () => {
    const id = await createSelfSigned({
      name: 'R',
      years: 3,
      keyType: 'rsa-2048',
    });
    expect(id.info.keyDescription).toBe('RSA 2048');
    expect(id.info.notAfter.getFullYear() - new Date().getFullYear()).toBe(3);
  });

  it('refuses an empty name', async () => {
    await expect(
      createSelfSigned({ name: ' ', years: 1, keyType: 'ecdsa-p256' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});

describe('exportPkcs12', () => {
  it('round-trips through importPkcs12', async () => {
    const id = await createSelfSigned({
      name: 'Round Trip',
      years: 1,
      keyType: 'ecdsa-p256',
    });
    const p12 = await exportPkcs12(
      { certificate: id.certificate, keyPair: id.exportable },
      PW,
    );
    const back = await importPkcs12(p12, PW);
    expect(back.info.sha256).toBe(id.info.sha256);
    expect(back.algorithm).toEqual(id.algorithm);
    if (opensslAvailable()) expect(opensslAcceptsP12(p12, PW)).toBe(0);
  }, 30_000);

  it('refuses a password shorter than 8 characters', async () => {
    const id = await createSelfSigned({
      name: 'Short',
      years: 1,
      keyType: 'ecdsa-p256',
    });
    await expect(
      exportPkcs12(
        { certificate: id.certificate, keyPair: id.exportable },
        'short',
      ),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});
