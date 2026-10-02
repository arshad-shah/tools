import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { opensslAvailable } from '../../../../test/fixtures/signing';
import { createCms, OID, parseCms } from './cms';
import { createSelfSigned } from './self-signed';

const content = new TextEncoder().encode('%PDF-1.7 signed bytes');

describe.each(['ecdsa-p256', 'rsa-2048'] as const)(
  'createCms (%s)',
  (keyType) => {
    it('builds a detached SignedData that verifies', async () => {
      const id = await createSelfSigned({
        name: 'CMS Test',
        years: 1,
        keyType,
      });
      const der = await createCms(content, id);
      const signed = parseCms(der);
      expect(signed.encapContentInfo.eContent).toBeUndefined();
      expect(signed.digestAlgorithms.map((a) => a.algorithmId)).toEqual([
        OID.sha256,
      ]);
      const attrs = signed.signerInfos[0].signedAttrs!.attributes.map(
        (a) => a.type,
      );
      expect([...attrs].sort()).toEqual(
        [OID.contentType, OID.messageDigest, OID.signingCertificateV2].sort(),
      );
      expect(attrs).not.toContain(OID.signingTime);
      expect(
        await signed.verify({
          signer: 0,
          data: content.slice().buffer,
          checkChain: false,
        }),
      ).toBe(true);
      const other = new TextEncoder().encode('%PDF-1.7 other bytes');
      // pkijs rejects (rather than resolving false) on a digest mismatch.
      await expect(
        signed.verify({
          signer: 0,
          data: other.slice().buffer,
          checkChain: false,
        }),
      ).rejects.toThrow("Message digest doesn't match");
    });

    it.skipIf(!opensslAvailable())('verifies with openssl cms', async () => {
      const id = await createSelfSigned({
        name: 'CMS Test',
        years: 1,
        keyType,
      });
      const der = await createCms(content, id);
      const dir = mkdtempSync(join(tmpdir(), 'cms-'));
      try {
        writeFileSync(join(dir, 'sig.der'), der);
        writeFileSync(join(dir, 'data.bin'), content);
        const out = spawnSync(
          'openssl',
          [
            'cms',
            '-verify',
            '-binary',
            '-inform',
            'DER',
            '-in',
            'sig.der',
            '-content',
            'data.bin',
            '-noverify',
            '-purpose',
            'any',
            '-out',
            'out.bin',
          ],
          { cwd: dir, encoding: 'utf8' },
        );
        expect(out.status, out.stderr).toBe(0);
        expect(out.stderr).toMatch(/Verification successful/);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  },
);

describe('createCms timestamp hook', () => {
  it('adds the token as an unsigned attribute over the signature value', async () => {
    const id = await createSelfSigned({
      name: 'TS',
      years: 1,
      keyType: 'ecdsa-p256',
    });
    let seen: ArrayBuffer | null = null;
    // A DER NULL stands in for the token here; tsa.test.ts uses a real one.
    const der = await createCms(content, id, {
      timestamp: async (v) => {
        seen = v;
        return new Uint8Array([0x05, 0x00]).buffer;
      },
    });
    const si = parseCms(der).signerInfos[0];
    expect(si.unsignedAttrs!.attributes[0].type).toBe(OID.timeStampToken);
    expect(new Uint8Array(seen!)).toEqual(si.signature.valueBlock.valueHexView);
  });
});
