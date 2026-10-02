import { check } from '@arshad-shah/qpdf-wasm';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { beforeAll, describe, expect, it } from 'vitest';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { signBytes } from '../../../../test/fixtures/signing';
import type { SigningIdentity } from './pkcs12';
import { createSelfSigned } from './self-signed';
import { readTail } from './tail';
import { verifyPdfSignatures } from './verify';

let id: SigningIdentity;
beforeAll(async () => {
  id = await createSelfSigned({
    name: 'Jane Doe',
    years: 1,
    keyType: 'ecdsa-p256',
  });
});

async function widgets(bytes: Uint8Array) {
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const pdf = await task.promise;
    const out = [];
    for (let i = 1; i <= pdf.numPages; i++)
      for (const a of await (await pdf.getPage(i)).getAnnotations())
        out.push({ page: i, ...a });
    return { pages: pdf.numPages, out };
  } finally {
    await task.destroy();
  }
}

const base = async (useObjectStreams: boolean) =>
  (await PDFDocument.load(await makeTextPdf({ pages: 3 }))).save({
    useObjectStreams,
  });

const ink = {
  kind: 'ink' as const,
  vector: {
    d: 'M2 10C10 2 20 18 30 10L30 12C20 20 10 4 2 12Z',
    width: 32,
    height: 22,
  },
  color: '#1d4ed8',
};

describe.each([
  ['table', false],
  ['stream', true],
] as const)('prepareSignature (%s xref)', (kind, objectStreams) => {
  it('signs incrementally with a visible appearance', async () => {
    const original = await base(objectStreams);
    expect(readTail(original).kind).toBe(kind);
    const rect = { x: 72, y: 100, width: 180, height: 60 };
    const signed = await signBytes(original, id, {
      placement: { pageIndex: 1, rect, visual: ink },
    });
    expect(signed.subarray(0, original.length)).toEqual(original);
    expect((await PDFDocument.load(signed)).getPageCount()).toBe(3);
    const { pages, out } = await widgets(signed);
    expect(pages).toBe(3);
    const sig = out.find((a) => a.fieldType === 'Sig')!;
    expect(sig.page).toBe(2);
    expect(sig.rect.map((n: number) => Math.round(n))).toEqual([
      72, 100, 252, 160,
    ]);
    const diag = await check(signed);
    expect(diag.warnings).toEqual([]);
    const [r] = await verifyPdfSignatures(signed);
    expect(r.integrity).toBe('intact');
    expect(r.coverage).toBe('whole-document');
  });
});

describe('prepareSignature', () => {
  it('writes an invisible signature with an empty rect', async () => {
    const signed = await signBytes(await base(false), id);
    const sig = (await widgets(signed)).out.find((a) => a.fieldType === 'Sig')!;
    expect(sig.rect).toEqual([0, 0, 0, 0]);
  });

  it('keeps an earlier signature intact when signing again', async () => {
    const once = await signBytes(await base(false), id, {
      placement: {
        pageIndex: 0,
        rect: { x: 50, y: 50, width: 120, height: 40 },
        visual: ink,
      },
    });
    const other = await createSelfSigned({
      name: 'Second',
      years: 1,
      keyType: 'rsa-2048',
    });
    const twice = await signBytes(once, other);
    const reports = await verifyPdfSignatures(twice);
    expect(reports).toHaveLength(2);
    expect(reports.map((r) => r.integrity)).toEqual(['intact', 'intact']);
    expect(reports[0].coverage).toBe('changed-after-signing');
    expect(reports[0].revisionsAfter).toBe(1);
    expect(reports[1].coverage).toBe('whole-document');
    expect(reports.map((r) => r.fieldName)).toEqual([
      'Signature1',
      'Signature2',
    ]);
  });
});
