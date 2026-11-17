import * as pkijs from 'pkijs';
import { describe, expect, it } from 'vitest';
import { toPem } from '@/shared/lib/crypto/keys';
import { asn1Tree } from './asn1-tree';
import { ipText } from './names';
import { looksLikeText, splitPem } from './pem';
import { certSigned, checkSignature, ecdsaDerToRaw } from './verify';
import { validity, validityText } from './x509';
import { der, makeChain, newKeys, rdn, makeCert } from './sample';

const DAY = 86_400_000;

describe('splitPem', () => {
  it('finds every block with its kind', () => {
    const text = `junk\n${toPem('CERTIFICATE', new Uint8Array([1]))}\n${toPem('NEW CERTIFICATE REQUEST', new Uint8Array([2]))}`;
    const blocks = splitPem(text);
    expect(blocks.map((b) => b.kind)).toEqual(['certificate', 'csr']);
    expect(Array.from(blocks[1].der)).toEqual([2]);
  });
  it('explains broken armour', () => {
    expect(() => splitPem('-----BEGIN CERTIFICATE-----\nAAAA')).toThrow(
      /no matching END/,
    );
    expect(() =>
      splitPem('-----BEGIN CERTIFICATE-----\nAAAA\n-----END PUBLIC KEY-----'),
    ).toThrow(/ends as PUBLIC KEY/);
    expect(splitPem('  ')).toEqual([]);
  });
  it('tells DER from text', () => {
    expect(looksLikeText(new Uint8Array([0x30, 0x82]))).toBe(false);
    expect(looksLikeText(new TextEncoder().encode('-----BEGIN'))).toBe(true);
  });
});

describe('validity', () => {
  const now = Date.parse('2026-06-01T00:00:00Z');
  const cert = (from: number, to: number) => ({
    notBefore: new Date(now + from * DAY),
    notAfter: new Date(now + to * DAY),
  });
  it('counts the days in words', () => {
    expect(validityText(validity(cert(-10, 89.5), now))).toBe(
      'Expires in 89 days',
    );
    expect(validity(cert(-10, 10), now).state).toBe('expiring');
    expect(validityText(validity(cert(-10, 0.5), now))).toBe('Expires today');
    expect(validityText(validity(cert(-10, -3), now))).toBe(
      'Expired 3 days ago',
    );
    expect(validityText(validity(cert(1, 30), now))).toBe(
      'Not valid for another 1 day',
    );
  });
});

describe('signatures', () => {
  it('reports algorithms WebCrypto cannot check', async () => {
    const { leaf, mid } = await makeChain('ec');
    const signed = certSigned(leaf);
    const md5 = new pkijs.AlgorithmIdentifier({
      algorithmId: '1.2.840.113549.1.1.4',
    });
    const r = await checkSignature(
      { ...signed, algorithm: md5 },
      mid.subjectPublicKeyInfo,
    );
    expect(r).toMatchObject({
      state: 'unsupported',
      algorithm: 'MD5 with RSA',
    });
  });

  it('checks RSA-PSS', async () => {
    const keys = await newKeys('rsa-pss');
    const name = rdn('pss.test');
    const cert = await makeCert({
      subject: name,
      issuer: name,
      publicKey: keys.publicKey,
      signingKey: keys.privateKey,
    });
    const r = await checkSignature(certSigned(cert), cert.subjectPublicKeyInfo);
    expect(r).toMatchObject({ state: 'valid', algorithm: 'RSASSA-PSS' });
  });

  it('converts ECDSA signatures to raw r and s', () => {
    // SEQUENCE { INTEGER 0x00ff, INTEGER 0x01 }
    const raw = ecdsaDerToRaw(
      new Uint8Array([0x30, 0x07, 0x02, 0x02, 0x00, 0xff, 0x02, 0x01, 0x01]),
      4,
    );
    expect(Array.from(raw)).toEqual([0, 0, 0, 0xff, 0, 0, 0, 1]);
    expect(() => ecdsaDerToRaw(new Uint8Array([5, 0]), 4)).toThrow();
  });
});

describe('asn1Tree', () => {
  it('builds a tree with names for OIDs', async () => {
    const { root } = await makeChain('ec');
    const tree = asn1Tree(der(root));
    expect(tree?.root[0].label).toBe('SEQUENCE (3)');
    const flat: string[] = [];
    const walk = (n: { value: string | null; children?: unknown[] }) => {
      if (n.value) flat.push(n.value);
      (n.children as (typeof n)[] | undefined)?.forEach(walk);
    };
    walk(tree!.root[0]);
    expect(flat).toContain('ECDSA with SHA-256 (1.2.840.10045.4.3.2)');
    expect(flat).toContain('Test Root CA');
    expect(asn1Tree(new Uint8Array([0xff]))).toBeNull();
  });
});

describe('ipText', () => {
  it('formats address bytes', () => {
    expect(ipText(new Uint8Array([10, 0, 0, 1]))).toBe('10.0.0.1');
    const v6 = new Uint8Array(16);
    v6[0] = 0x20;
    v6[1] = 0x01;
    v6[15] = 1;
    expect(ipText(v6)).toBe('2001::1');
    expect(ipText(new Uint8Array([10, 0, 0, 0, 255, 0, 0, 0]))).toBe(
      '10.0.0.0/255.0.0.0',
    );
  });
});
