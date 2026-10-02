import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { makeChain, signBytes } from '../../../../test/fixtures/signing';
import { makeTestTsa, tsaFetch } from '../../../../test/fixtures/test-tsa';
import { appendIncrement, serializeObject } from './incremental';
import type { SigningIdentity } from './pkcs12';
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { describeCertificate } from './cert-info';
import { createCms, parseCms } from './cms';
import { buildCertificate, createSelfSigned } from './self-signed';
import { readTail } from './tail';
import { requestTimestamp } from './tsa';
import {
  DEVICE_CLOCK_NOTE,
  INVALID_SUMMARY,
  REVOCATION_NOTE,
  MORE_NOT_CHECKED,
  digestNote,
  SHA1_NOTE,
  signingCertificateMatches,
  signingCertificateProblem,
  TIMESTAMP_UNVERIFIED_NOTE,
  verifyPdfSignatures,
} from './verify';

const DAY = 86_400_000;
let pdf: Uint8Array;
let id: SigningIdentity;

beforeAll(async () => {
  pdf = await (
    await PDFDocument.load(await makeTextPdf({ pages: 2 }))
  ).save({
    useObjectStreams: false,
  });
  id = await createSelfSigned({
    name: 'Jane Doe',
    years: 1,
    keyType: 'ecdsa-p256',
  });
});

describe('verifyPdfSignatures', () => {
  it('reports a fresh self-signed signature honestly', async () => {
    const [r] = await verifyPdfSignatures(await signBytes(pdf, id));
    expect(r).toMatchObject({
      integrity: 'intact',
      signatureValid: true,
      trust: 'self-signed',
      coverage: 'whole-document',
      revisionsAfter: 0,
      timestampValid: null,
      subFilter: 'ETSI.CAdES.detached',
    });
    expect(r.time.source).toBe('device-clock');
    expect(r.time.value).toBeInstanceOf(Date);
    expect(r.signer?.subjectCN).toBe('Jane Doe');
    expect(r.summary).toBe(
      'Valid signature from a self-signed certificate. Nobody has verified who Jane Doe is.',
    );
    expect(r.notes).toEqual([DEVICE_CLOCK_NOTE, REVOCATION_NOTE]);
  });

  it('reports a changed byte inside the signed range as broken', async () => {
    const signed = await signBytes(pdf, id);
    const tampered = signed.slice();
    tampered[200] ^= 0x01;
    const [r] = await verifyPdfSignatures(tampered);
    expect(r.integrity).toBe('broken');
    expect(r.summary).toBe(INVALID_SUMMARY);
    expect(r.problems.length).toBeGreaterThan(0);
  });

  it('reports a later increment as not covered', async () => {
    const signed = await signBytes(pdf, id);
    const tail = readTail(signed);
    const scratch = await PDFDocument.create();
    const later = appendIncrement(
      signed,
      [
        {
          num: tail.size,
          gen: 0,
          bytes: serializeObject(
            tail.size,
            0,
            scratch.context.obj({ Note: true }),
          ),
        },
      ],
      tail,
    );
    const [r] = await verifyPdfSignatures(later);
    expect(r.integrity).toBe('intact');
    expect(r.signatureValid).toBe(true);
    expect(r.coverage).toBe('changed-after-signing');
    expect(r.revisionsAfter).toBe(1);
    expect(r.notes[0]).toBe(
      'The document has 1 later revision not covered by this signature.',
    );
  });

  it('trusts a chain only when its root was imported', async () => {
    const chain = await makeChain();
    const signed = await signBytes(pdf, chain.leaf);
    const [untrusted] = await verifyPdfSignatures(signed);
    expect(untrusted.trust).toBe('untrusted-issuer');
    expect(untrusted.summary).toBe(
      'Valid signature, but the certificate issuer is not trusted on this device.',
    );
    expect(untrusted.chain.map((c) => c.subjectCN)).toEqual([
      'Chain Signer',
      'Test Intermediate CA',
    ]);
    const [trusted] = await verifyPdfSignatures(signed, {
      trustedRoots: [chain.root],
    });
    expect(trusted.trust).toBe('trusted');
    expect(trusted.summary).toBe(
      'Valid. Signed by Chain Signer. The certificate chains to a root you imported.',
    );
    expect(trusted.chain.map((c) => c.subjectCN)).toEqual([
      'Chain Signer',
      'Test Intermediate CA',
      'Test Root CA',
    ]);
    // A different root with the same name does not make it trusted.
    const impostor = await makeChain();
    const [other] = await verifyPdfSignatures(signed, {
      trustedRoots: [impostor.root],
    });
    expect(other.trust).not.toBe('trusted');
  });

  it('flags a certificate that was not valid at the signing time', async () => {
    const chain = await makeChain({
      from: new Date(Date.now() - 10 * DAY),
      to: new Date(Date.now() - 5 * DAY),
    });
    const [r] = await verifyPdfSignatures(await signBytes(pdf, chain.leaf), {
      trustedRoots: [chain.root],
    });
    expect(r.trust).toBe('expired-at-signing');
    expect(r.summary).toBe(
      'Valid signature, but the certificate was not valid at the signing time.',
    );
  });

  it('takes the time from a timestamp only when its TSA is trusted', async () => {
    // Inside the TSA certificate's validity, whole seconds (GeneralizedTime).
    const genTime = new Date(Math.floor(Date.now() / 1000) * 1000 - 3_600_000);
    const tsa = await makeTestTsa({ genTime });
    const signed = await signWithTsa(pdf, id, tsa);
    const [trusted] = await verifyPdfSignatures(signed, {
      trustedRoots: [tsa.certificate],
    });
    expect(trusted.timestampValid).toBe(true);
    expect(trusted.timestampVerified).toBe(true);
    expect(trusted.time).toEqual({ value: genTime, source: 'timestamp' });
    expect(trusted.notes).toEqual([REVOCATION_NOTE]);

    const [unknown] = await verifyPdfSignatures(signed);
    expect(unknown.timestampValid).toBe(true);
    expect(unknown.timestampVerified).toBe(false);
    expect(unknown.time.source).toBe('device-clock');
    expect(unknown.notes).toContain(TIMESTAMP_UNVERIFIED_NOTE);
  });

  it('does not verify a timestamp whose TSA lacks the timeStamping EKU', async () => {
    const tsa = await makeTestTsa({ noTimestampingEku: true });
    const signed = await signWithTsa(pdf, id, tsa);
    const [r] = await verifyPdfSignatures(signed, {
      trustedRoots: [tsa.certificate],
    });
    expect(r.timestampVerified).toBe(false);
    expect(r.time.source).toBe('device-clock');
  });

  it('does not let a self-made timestamp hide an expired certificate', async () => {
    const chain = await makeChain({
      from: new Date(Date.now() - 30 * DAY),
      to: new Date(Date.now() - 10 * DAY),
    });
    // A token claiming a time inside the expired certificate's validity.
    const tsa = await makeTestTsa({ genTime: new Date(Date.now() - 20 * DAY) });
    const signed = await signWithTsa(pdf, chain.leaf, tsa);
    const [r] = await verifyPdfSignatures(signed, {
      trustedRoots: [chain.root],
    });
    expect(r.trust).toBe('expired-at-signing');
    expect(r.time.source).toBe('device-clock');
    expect(r.summary).toBe(
      'Valid signature, but the certificate is not valid now and the signing time is not verified.',
    );
  });

  it('reports an object injected into the unsigned gap as not valid', async () => {
    const signed = await signBytes(pdf, id);
    const text = new TextDecoder('latin1').decode(signed);
    const m = [...text.matchAll(/\/ByteRange \[0 (\d+) +(\d+)/g)].at(-1)!;
    const contentsEnd = Number(m[2]);
    // Zero padding sits just before the closing '>': hide an object there.
    const injected = ' 99 0 obj (hidden) endobj ';
    const wrapped = signed.slice();
    wrapped.set(
      new TextEncoder().encode(injected),
      contentsEnd - 1 - injected.length,
    );
    const [r] = await verifyPdfSignatures(wrapped);
    expect(r.integrity).toBe('broken');
    expect(r.signatureValid).toBe(false);
    expect(r.summary).toBe(INVALID_SUMMARY);
  });

  it('never trusts a certificate issued by an end-entity certificate', async () => {
    const chain = await makeChain();
    const keys = (await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign', 'verify'],
    )) as CryptoKeyPair;
    const minted = await buildCertificate({
      subject: cn('Minted Signer'),
      issuer: chain.leaf.certificate.subject,
      publicKey: keys.publicKey,
      signingKey: chain.leaf.privateKey,
      notBefore: new Date(Date.now() - DAY),
      notAfter: new Date(Date.now() + DAY),
      ca: false,
    });
    const identity: SigningIdentity = {
      privateKey: keys.privateKey,
      algorithm: { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' },
      certificate: minted,
      chain: [chain.leaf.certificate, chain.intermediate],
      info: describeCertificate(minted),
    };
    const [r] = await verifyPdfSignatures(await signBytes(pdf, identity), {
      trustedRoots: [chain.root],
    });
    expect(r.trust).not.toBe('trusted');
    expect(r.trust).toBe('invalid-certificate');
  });

  it('honours pathLenConstraint', async () => {
    const chain = await makeChain(undefined, { rootPathLen: 0 });
    const [r] = await verifyPdfSignatures(await signBytes(pdf, chain.leaf), {
      trustedRoots: [chain.root],
    });
    expect(r.trust).toBe('invalid-certificate');
  });

  it('checks signingCertificateV2 against the signer certificate', async () => {
    const other = await createSelfSigned({
      name: 'Other',
      years: 1,
      keyType: 'ecdsa-p256',
    });
    const si = parseCms(await createCms(new Uint8Array([1, 2]), id))
      .signerInfos[0];
    expect(signingCertificateMatches(si, id.certificate)).toBe(true);
    expect(signingCertificateMatches(si, other.certificate)).toBe(false);
  });

  it('says when more signatures were left unchecked', async () => {
    const twice = await signBytes(await signBytes(pdf, id), id);
    const reports = await verifyPdfSignatures(twice, { maxSignatures: 1 });
    expect(reports).toHaveLength(1);
    expect(reports[0].notes.join(' ')).toMatch(
      /More signatures were not checked/,
    );
    expect(MORE_NOT_CHECKED).toMatch(/at most 50/);
  });

  it('flags a CAdES signature without signingCertificateV2', () => {
    expect(signingCertificateProblem(null, 'ETSI.CAdES.detached')).toMatch(
      /signing certificate/,
    );
    expect(signingCertificateProblem(null, 'adbe.pkcs7.detached')).toBeNull();
  });

  it('says an unverified signing time is stated by the signer', () => {
    expect(DEVICE_CLOCK_NOTE).toBe(
      'The signing time is stated by the signer and is not verified.',
    );
  });

  it('warns about SHA-1 digests only', () => {
    expect(digestNote('SHA-1')).toBe(SHA1_NOTE);
    expect(SHA1_NOTE).toBe(
      'This signature uses SHA-1, which is no longer considered secure.',
    );
    expect(digestNote('SHA-256')).toBeNull();
  });

  it('returns nothing for an unsigned file', async () => {
    expect(await verifyPdfSignatures(pdf)).toEqual([]);
  });
});

async function signWithTsa(
  bytes: Uint8Array,
  identity: SigningIdentity,
  tsa: Awaited<ReturnType<typeof makeTestTsa>>,
) {
  vi.stubGlobal('fetch', tsaFetch(tsa));
  try {
    return await signBytes(bytes, identity, {
      timestamp: (value) =>
        requestTimestamp(value, {
          url: 'https://tsa.test/',
          signal: new AbortController().signal,
        }),
    });
  } finally {
    vi.unstubAllGlobals();
  }
}

function cn(value: string) {
  const n = new pkijs.RelativeDistinguishedNames();
  n.typesAndValues.push(
    new pkijs.AttributeTypeAndValue({
      type: '2.5.4.3',
      value: new asn1js.Utf8String({ value }),
    }),
  );
  return n;
}
