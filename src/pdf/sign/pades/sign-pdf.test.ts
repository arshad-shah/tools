import { check } from '@arshad-shah/qpdf-wasm';
import {
  decodePDFRawStream,
  degrees,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFString,
} from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { beforeAll, describe, expect, it } from 'vitest';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { signBytes } from '../../../../test/fixtures/signing';
import type { SigningIdentity } from './pkcs12';
import { createSelfSigned } from './self-signed';
import { INLINE_FIELD_MESSAGE, prepareSignature } from './sign-pdf';
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

  it('refuses clearly to sign into a field held inline in /Fields', async () => {
    const doc = await PDFDocument.load(await makeTextPdf({ pages: 1 }));
    const field = doc.context.obj({
      FT: 'Sig',
      T: PDFString.of('Inline'),
      Rect: [10, 10, 110, 50],
    });
    doc.catalog.set(
      PDFName.of('AcroForm'),
      doc.context.register(doc.context.obj({ Fields: [field] })),
    );
    const bytes = await doc.save({ useObjectStreams: false });
    await expect(
      prepareSignature({
        bytes,
        placement: {
          pageIndex: 0,
          rect: { x: 10, y: 10, width: 100, height: 40 },
          visual: null,
          fieldName: 'Inline',
        },
        m: new Date(),
        caption: false,
        name: 'T',
        contentsBytes: 16384,
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: INLINE_FIELD_MESSAGE('Inline'),
    });
  });

  it('turns the visual and its caption with a quarter-turned page', async () => {
    const doc = await PDFDocument.load(await makeTextPdf({ pages: 1 }));
    doc.getPage(0).setRotation(degrees(90));
    const signed = await signBytes(
      await doc.save({ useObjectStreams: false }),
      id,
      {
        placement: {
          pageIndex: 0,
          rect: { x: 72, y: 72, width: 60, height: 180 },
          visual: ink,
        },
      },
    );
    const out = await PDFDocument.load(signed);
    const annots = out.getPage(0).node.lookup(PDFName.of('Annots'));
    const widget = (annots as unknown as { asArray(): unknown[] })
      .asArray()
      .map((r) => out.context.lookup(r as never))
      .find(
        (d) =>
          d instanceof PDFDict &&
          d.lookup(PDFName.of('FT')) === PDFName.of('Sig'),
      ) as PDFDict;
    const ap = (widget.lookup(PDFName.of('AP')) as PDFDict).lookup(
      PDFName.of('N'),
    ) as PDFRawStream;
    const content = new TextDecoder('latin1').decode(
      decodePDFRawStream(ap).decode(),
    );
    expect(content).toContain('0 1 -1 0 60 0 cm');
    const [r] = await verifyPdfSignatures(signed);
    expect(r.integrity).toBe('intact');
  });
});
