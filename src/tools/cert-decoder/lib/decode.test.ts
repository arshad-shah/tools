import * as pkijs from 'pkijs';
import { describe, expect, it } from 'vitest';
import { toPem } from '@/shared/lib/crypto/keys';
import { decodeInput, derToPem, type DecodedItem } from './decode';
import { der, makeChain, makeCsr, newKeys } from './sample';

type Cert = Extract<DecodedItem, { kind: 'certificate' }>;
const pem = (c: pkijs.Certificate) => toPem('CERTIFICATE', der(c));

describe('decodeInput: certificates', () => {
  it('reads every field of a leaf certificate', async () => {
    const { leaf } = await makeChain('ec');
    const [item] = (await decodeInput(pem(leaf))) as Cert[];
    expect(item.kind).toBe('certificate');
    const v = item.view;
    expect(v.title).toBe('example.test');
    expect(v.subjectText).toBe('O=Test Org, CN=example.test');
    expect(v.issuerText).toBe('O=Test Org, CN=Test Intermediate CA');
    expect(v.version).toBe(3);
    expect(v.serial).toBe('03');
    expect(v.key.description).toBe('EC P-256');
    expect(v.signatureAlgorithm).toBe('ECDSA with SHA-256');
    expect(v.ext.sans).toEqual([
      { type: 'DNS', value: 'example.test' },
      { type: 'DNS', value: '*.example.test' },
      { type: 'IP', value: '192.0.2.1' },
      { type: 'Email', value: 'admin@example.test' },
      { type: 'URI', value: 'https://example.test/' },
    ]);
    expect(v.ext.keyUsage).toEqual(['Digital signature', 'Key encipherment']);
    expect(v.ext.extKeyUsage[0]).toMatch(/TLS server authentication/);
    expect(v.ext.basicConstraints).toEqual({ ca: false, pathLen: null });
    expect(v.ext.subjectKeyId).toMatch(/^([0-9a-f]{2}:){19}[0-9a-f]{2}$/);
    expect(v.ext.aia).toEqual([
      { method: 'OCSP', location: 'http://ocsp.example.test' },
      { method: 'CA issuers', location: 'http://ca.example.test/ca.crt' },
    ]);
    expect(v.ext.crl).toEqual(['http://crl.example.test/ca.crl']);
    expect(v.ext.policies[0].name).toMatch(/Domain validated/);
    expect(v.ext.all.find((e) => e.oid === '2.5.29.19')?.critical).toBe(true);
    expect(item.fingerprints.sha256).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
    expect(item.fingerprints.sha1.split(':')).toHaveLength(20);
  });

  it('checks a chain in the order given', async () => {
    const { leaf, mid, root } = await makeChain('ec');
    const items = (await decodeInput(
      [leaf, mid, root].map(pem).join('\n'),
    )) as Cert[];
    expect(items.map((i) => i.link?.issuerMatchesNext)).toEqual([
      true,
      true,
      null,
    ]);
    expect(items.map((i) => i.link?.signature?.state)).toEqual([
      'valid',
      'valid',
      'valid',
    ]);
    expect(items[2].link?.selfSigned).toBe(true);
    expect(items[1].view.ext.basicConstraints).toEqual({
      ca: true,
      pathLen: 0,
    });
    expect(items[1].view.ext.keyUsage).toEqual([
      'Certificate signing',
      'CRL signing',
    ]);
  });

  it('verifies RSA chains too', async () => {
    const { leaf, mid } = await makeChain('rsa');
    const items = (await decodeInput(pem(leaf) + pem(mid))) as Cert[];
    expect(items[0].view.key.description).toBe('RSA 2048');
    expect(items[0].view.key.exponent).toBe('65537');
    expect(items[0].link?.signature?.state).toBe('valid');
    expect(items[1].link?.notChecked).toMatch(/not in the input/);
  });

  it('flags a wrong order and a bad signature', async () => {
    const a = await makeChain('ec');
    const b = await makeChain('ec');
    const wrong = (await decodeInput(pem(a.leaf) + pem(a.root))) as Cert[];
    expect(wrong[0].link?.issuerMatchesNext).toBe(false);
    expect(wrong[0].link?.notChecked).toMatch(/not this one's issuer/);
    // Same names, different keys: the issuer matches but the signature fails.
    const forged = (await decodeInput(pem(a.leaf) + pem(b.mid))) as Cert[];
    expect(forged[0].link?.issuerMatchesNext).toBe(true);
    expect(forged[0].link?.signature?.state).toBe('invalid');
  });

  it('reads DER given as bare base64', async () => {
    const { root } = await makeChain('ec');
    const b64 = toPem('CERTIFICATE', der(root))
      .split('\n')
      .filter((l) => l && !l.startsWith('-----'))
      .join('');
    const [item] = await decodeInput(b64);
    expect(item.kind).toBe('certificate');
  });
});

describe('decodeInput: requests and keys', () => {
  it('reads a CSR and checks its self-signature', async () => {
    const { csr } = await makeCsr('ec');
    const [item] = await decodeInput(toPem('CERTIFICATE REQUEST', der(csr)));
    if (item.kind !== 'csr') throw new Error(item.kind);
    expect(item.view.subjectText).toBe('O=Test Org, CN=csr.example.test');
    expect(item.view.ext.sans).toEqual([
      { type: 'DNS', value: 'csr.example.test' },
    ]);
    expect(item.signature.state).toBe('valid');
  });

  it('describes public and private keys without their values', async () => {
    const keys = await newKeys('ec');
    const spki = new Uint8Array(
      await crypto.subtle.exportKey('spki', keys.publicKey),
    );
    const pkcs8 = new Uint8Array(
      await crypto.subtle.exportKey('pkcs8', keys.privateKey),
    );
    const items = await decodeInput(
      toPem('PUBLIC KEY', spki) + toPem(['PRIVATE', 'KEY'].join(' '), pkcs8),
    );
    expect(items[0]).toMatchObject({
      kind: 'public-key',
      key: { description: 'EC P-256' },
    });
    expect(items[1]).toMatchObject({
      kind: 'private-key',
      summary: {
        format: 'PKCS #8 private key',
        key: { description: 'EC P-256' },
      },
    });
    const rsa = await newKeys('rsa');
    const rsa8 = new Uint8Array(
      await crypto.subtle.exportKey('pkcs8', rsa.privateKey),
    );
    const [r] = await decodeInput(toPem(['PRIVATE', 'KEY'].join(' '), rsa8));
    expect(r).toMatchObject({ summary: { key: { description: 'RSA 2048' } } });
  });

  it('labels binary DER from a file by what it is', async () => {
    const { root } = await makeChain('ec');
    const { csr } = await makeCsr('ec');
    expect(derToPem(der(root))).toMatch(/^-----BEGIN CERTIFICATE-----/);
    expect(derToPem(der(csr))).toMatch(/^-----BEGIN CERTIFICATE REQUEST/);
    expect(() => derToPem(new Uint8Array([1, 2, 3]))).toThrow(
      /not a certificate, request or key/,
    );
  });

  it('reports what it cannot decode, block by block', async () => {
    const { root } = await makeChain('ec');
    const items = await decodeInput(
      `${pem(root)}${toPem('X509 CRL', new Uint8Array([1, 2, 3]))}`,
    );
    expect(items[0].kind).toBe('certificate');
    expect(items[1]).toMatchObject({
      kind: 'error',
      message: /X509 CRL blocks/,
    });
    const [bad] = await decodeInput(
      toPem('CERTIFICATE', new Uint8Array([0x30, 0x03, 1, 2, 3])),
    );
    expect(bad).toMatchObject({ kind: 'error', message: /not a valid X.509/ });
    await expect(decodeInput('not base64 at all!')).rejects.toThrow(
      /not valid base64/,
    );
  });
});
