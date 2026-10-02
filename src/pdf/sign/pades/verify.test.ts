import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { makeChain, signBytes } from '../../../../test/fixtures/signing';
import { makeTestTsa, tsaFetch } from '../../../../test/fixtures/test-tsa';
import { appendIncrement, serializeObject } from './incremental';
import type { SigningIdentity } from './pkcs12';
import { createSelfSigned } from './self-signed';
import { readTail } from './tail';
import { requestTimestamp } from './tsa';
import {
  DEVICE_CLOCK_NOTE,
  INVALID_SUMMARY,
  REVOCATION_NOTE,
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

  it('takes the time from a valid timestamp', async () => {
    const tsa = await makeTestTsa({
      genTime: new Date(Date.UTC(2026, 0, 2, 3, 4, 5)),
    });
    vi.stubGlobal('fetch', tsaFetch(tsa));
    const signed = await signBytes(pdf, id, {
      timestamp: (value) =>
        requestTimestamp(value, {
          url: 'https://tsa.test/',
          signal: new AbortController().signal,
        }),
    });
    vi.unstubAllGlobals();
    const [r] = await verifyPdfSignatures(signed);
    expect(r.timestampValid).toBe(true);
    expect(r.time).toEqual({
      value: new Date(Date.UTC(2026, 0, 2, 3, 4, 5)),
      source: 'timestamp',
    });
    expect(r.notes).toEqual([REVOCATION_NOTE]);
  });

  it('returns nothing for an unsigned file', async () => {
    expect(await verifyPdfSignatures(pdf)).toEqual([]);
  });
});
