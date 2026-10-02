/*
 * Independent verification (plan H-15): the signed PDF's ByteRange content
 * and CMS go to `openssl cms -verify`; one changed byte must break it, and
 * our own verifier must agree. `-noverify` skips chain building only (the
 * certificate is self-signed); the signature math is fully checked.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { check } from '@arshad-shah/qpdf-wasm';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSelfSigned } from '../src/pdf/sign/pades/self-signed';
import { trimDer, verifyPdfSignatures } from '../src/pdf/sign/pades/verify';
import { makeTextPdf } from './fixtures/builders';
import { makeChain, opensslAvailable, signBytes } from './fixtures/signing';

const latin1 = new TextDecoder('latin1');

function byteRangeOf(
  file: Uint8Array,
  which: 'first' | 'last' = 'last',
): [number, number, number, number] {
  const text = latin1.decode(file);
  const all = [
    ...text.matchAll(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g),
  ];
  return all[which === 'first' ? 0 : all.length - 1]
    .slice(1, 5)
    .map(Number) as [number, number, number, number];
}

function contentsOf(file: Uint8Array, r: number[]): Uint8Array {
  const hex = latin1.decode(file.subarray(r[1] + 1, r[2] - 1));
  return Uint8Array.from(hex.match(/../g)!.map((h) => parseInt(h, 16)));
}

const concat = (a: Uint8Array, b: Uint8Array) => {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
};

let tmp = '';
beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'pades-'));
});
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function opensslVerify(data: Uint8Array, der: Uint8Array, name: string) {
  writeFileSync(join(tmp, `${name}.bin`), data);
  writeFileSync(join(tmp, `${name}.der`), der);
  return spawnSync(
    'openssl',
    [
      'cms',
      '-verify',
      '-binary',
      '-inform',
      'DER',
      '-in',
      join(tmp, `${name}.der`),
      '-content',
      join(tmp, `${name}.bin`),
      '-noverify',
      '-purpose',
      'any',
      '-out',
      join(tmp, `${name}.out`),
    ],
    { encoding: 'utf8' },
  );
}

async function fixture(): Promise<Uint8Array> {
  return (await PDFDocument.load(await makeTextPdf({ pages: 2 }))).save({
    useObjectStreams: false,
  });
}

// Skipped locally without openssl; on CI a missing openssl fails the suite.
const ON_CI = !!process.env.CI;

describe('independent verifier', () => {
  it.runIf(ON_CI)('openssl is installed on CI', () => {
    expect(opensslAvailable(), 'openssl must be on PATH in CI').toBe(true);
  });
});

describe.skipIf(!opensslAvailable() && !ON_CI)(
  'PAdES signatures verified by openssl',
  () => {
    it.each(['ecdsa-p256', 'rsa-2048'] as const)(
      'a %s signature verifies, and one changed byte breaks it',
      async (keyType) => {
        const id = await createSelfSigned({
          name: 'Open SSL',
          years: 1,
          keyType,
        });
        const signed = await signBytes(await fixture(), id, {
          placement: {
            pageIndex: 0,
            rect: { x: 72, y: 72, width: 160, height: 60 },
            visual: {
              kind: 'ink',
              vector: {
                d: 'M2 10C10 2 20 18 30 10L30 12C20 20 10 4 2 12Z',
                width: 32,
                height: 22,
              },
              color: '#111827',
            },
          },
        });
        const [r] = await verifyPdfSignatures(signed);
        expect(r.integrity).toBe('intact');
        const range = byteRangeOf(signed);
        expect(range[2] + range[3]).toBe(signed.length);
        const content = concat(
          signed.subarray(0, range[1]),
          signed.subarray(range[2], range[2] + range[3]),
        );
        const der = trimDer(contentsOf(signed, range));
        const ok = opensslVerify(content, der, `${keyType}-ok`);
        expect(ok.status, ok.stderr).toBe(0);
        expect(ok.stderr).toMatch(/Verification successful/);

        const tampered = signed.slice();
        tampered[200] ^= 0x01;
        const bad = opensslVerify(
          concat(
            tampered.subarray(0, range[1]),
            tampered.subarray(range[2], range[2] + range[3]),
          ),
          der,
          `${keyType}-bad`,
        );
        expect(bad.status).not.toBe(0);
        expect((await verifyPdfSignatures(tampered))[0].integrity).toBe(
          'broken',
        );

        expect((await check(signed)).warnings).toEqual([]);
        const task = getDocument({ data: signed.slice(), verbosity: 0 });
        try {
          expect((await task.promise).numPages).toBe(2);
        } finally {
          await task.destroy();
        }
      },
      30_000,
    );

    it('still verifies the first signature of a twice-signed file', async () => {
      const first = await createSelfSigned({
        name: 'First',
        years: 1,
        keyType: 'ecdsa-p256',
      });
      const second = await createSelfSigned({
        name: 'Second',
        years: 1,
        keyType: 'rsa-2048',
      });
      const twice = await signBytes(
        await signBytes(await fixture(), first),
        second,
      );
      for (const which of ['first', 'last'] as const) {
        const r = byteRangeOf(twice, which);
        const content = concat(
          twice.subarray(0, r[1]),
          twice.subarray(r[2], r[2] + r[3]),
        );
        const out = opensslVerify(
          content,
          trimDer(contentsOf(twice, r)),
          `twice-${which}`,
        );
        expect(out.status, out.stderr).toBe(0);
      }
      expect(
        byteRangeOf(twice, 'first')[2] + byteRangeOf(twice, 'first')[3],
      ).toBeLessThan(twice.length);
    }, 30_000);

    it('verifies a chained signer with the root as the trust anchor', async () => {
      const chain = await makeChain();
      const signed = await signBytes(await fixture(), chain.leaf);
      const range = byteRangeOf(signed);
      const content = concat(
        signed.subarray(0, range[1]),
        signed.subarray(range[2]),
      );
      const der = trimDer(contentsOf(signed, range));
      const root = chain.root.toSchema(true).toBER(false);
      const pem = `-----BEGIN CERTIFICATE-----\n${Buffer.from(root).toString('base64')}\n-----END CERTIFICATE-----\n`;
      writeFileSync(join(tmp, 'root.pem'), pem);
      writeFileSync(join(tmp, 'chain.bin'), content);
      writeFileSync(join(tmp, 'chain.der'), der);
      const out = spawnSync(
        'openssl',
        [
          'cms',
          '-verify',
          '-binary',
          '-inform',
          'DER',
          '-in',
          join(tmp, 'chain.der'),
          '-content',
          join(tmp, 'chain.bin'),
          '-CAfile',
          join(tmp, 'root.pem'),
          '-purpose',
          'any',
          '-out',
          join(tmp, 'chain.out'),
        ],
        { encoding: 'utf8' },
      );
      expect(out.status, out.stderr).toBe(0);
      expect(out.stderr).toMatch(/Verification successful/);
    }, 30_000);
  },
);
