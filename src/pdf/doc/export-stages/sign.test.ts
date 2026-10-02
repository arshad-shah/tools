import { PDFDocument } from 'pdf-lib';
import { DEFAULT_PERMISSIONS } from '@/pdf/edit/permissions';
import {
  AnnotationMode,
  getDocument,
  OPS,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import { beforeAll, describe, expect, it } from 'vitest';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { signBytes } from '../../../../test/fixtures/signing';
import type { SigningIdentity } from '@/pdf/sign/pades/pkcs12';
import { createSelfSigned } from '@/pdf/sign/pades/self-signed';
import { verifyPdfSignatures } from '@/pdf/sign/pades/verify';
import { BlobStore } from '../blob-store';
import { exportDocument } from '../export';
import { EXPORT_STAGES } from '../export-stages';
import { ALL_MATERIALIZERS } from '../materialize';
import { registerMaterializers } from '../materialize/registry';
import { registerCoreOperations } from '../ops';
import { inProcessServices } from '../test-services';
import { makeModel, makeState } from '../test-helpers';
import { SIGN_AND_PROTECT_MESSAGE } from './encrypt';
import { SIGN_ONLY_KEPT, signStage, type SignatureExportOption } from './sign';

const env = () => ({
  services: inProcessServices(),
  signal: new AbortController().signal,
  progress: () => {},
});

let id: SigningIdentity;
beforeAll(async () => {
  registerCoreOperations();
  registerMaterializers(ALL_MATERIALIZERS);
  id = await createSelfSigned({
    name: 'Jane Doe',
    years: 1,
    keyType: 'ecdsa-p256',
  });
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

async function setup(bytes?: Uint8Array) {
  const pdf = bytes ?? (await makeTextPdf({ pages: 2 }));
  const model = makeModel(makeState(2));
  const blobs = new BlobStore(null, 'doc1');
  blobs.addCheckpoint(model.currentCheckpoint(), pdf);
  return { pdf, model, blobs };
}

const sig = (
  patch: Partial<SignatureExportOption> = {},
): SignatureExportOption => ({
  identity: id,
  placementOpId: null,
  reason: 'Approval',
  location: '',
  caption: true,
  timestampUrl: null,
  summaryPage: false,
  ...patch,
});
const options = (signature: SignatureExportOption, patch = {}) => ({
  filename: 'signed.pdf',
  onlyPages: null,
  stripMetadata: false,
  signature,
  ...patch,
});

function place(model: ReturnType<typeof makeModel>) {
  const pageId = model.getView().pages[1].id;
  const [op] = model.dispatch({
    type: 'sign.place',
    params: {
      id: 'sig1',
      pageId,
      rect: { x: 100, y: 120, width: 150, height: 50 },
      rotate: 0,
      content: ink,
      role: 'signature',
    },
  });
  return op.id;
}

async function pageFillOps(bytes: Uint8Array, pageNo: number) {
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const page = await (await task.promise).getPage(pageNo);
    const list = await page.getOperatorList({
      annotationMode: AnnotationMode.DISABLE,
    });
    return list.fnArray.filter((f) => f === OPS.constructPath).length;
  } finally {
    await task.destroy();
  }
}

describe('sign export stage', () => {
  it('is the last registered stage', () => {
    expect(EXPORT_STAGES).toContain(signStage);
    expect(Math.max(...EXPORT_STAGES.map((s) => s.order))).toBe(
      signStage.order,
    );
  });

  it('signs invisibly and the output verifies', async () => {
    const { model, blobs } = await setup();
    const out = await exportDocument(model, blobs, options(sig()), env());
    const [r] = await verifyPdfSignatures(out.bytes);
    expect(r).toMatchObject({
      integrity: 'intact',
      signatureValid: true,
      coverage: 'whole-document',
      trust: 'self-signed',
    });
  });

  it('uses a placed signature as the appearance instead of page content', async () => {
    const { model, blobs } = await setup();
    const opId = place(model);
    const out = await exportDocument(
      model,
      blobs,
      options(sig({ placementOpId: opId })),
      env(),
    );
    expect(await pageFillOps(out.bytes, 2)).toBe(0);
    const task = getDocument({ data: out.bytes.slice(), verbosity: 0 });
    try {
      const annots = await (
        await (await task.promise).getPage(2)
      ).getAnnotations();
      const w = annots.find((a) => a.fieldType === 'Sig')!;
      expect(w.rect.map(Math.round)).toEqual([100, 120, 250, 170]);
    } finally {
      await task.destroy();
    }
    const plain = await exportDocument(
      model,
      blobs,
      options(null as never, { signature: undefined }),
      env(),
    );
    expect(await pageFillOps(plain.bytes, 2)).toBeGreaterThan(0);
  });

  it('adds a summary page before signing', async () => {
    const { model, blobs } = await setup();
    const out = await exportDocument(
      model,
      blobs,
      options(sig({ summaryPage: true })),
      env(),
    );
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(3);
    const [r] = await verifyPdfSignatures(out.bytes);
    expect(r.coverage).toBe('whole-document');
  });

  it('signs an already signed original incrementally when nothing else changed', async () => {
    const first = await signBytes(await makeTextPdf({ pages: 2 }), id);
    const { model, blobs } = await setup(first);
    const out = await exportDocument(model, blobs, options(sig()), env());
    expect(out.bytes.subarray(0, first.length)).toEqual(first);
    expect(out.warnings).toContain(SIGN_ONLY_KEPT);
    const reports = await verifyPdfSignatures(out.bytes);
    expect(reports.map((r) => r.integrity)).toEqual(['intact', 'intact']);
  });

  it('does not take "/ByteRange" text inside a stream for a signature', async () => {
    const doc = await PDFDocument.load(await makeTextPdf({ pages: 2 }));
    doc.context.register(
      doc.context.stream(['/By', 'teRange [0 1 2 3]'].join('')),
    );
    const { model, blobs } = await setup(
      await doc.save({ useObjectStreams: false }),
    );
    const out = await exportDocument(model, blobs, options(sig()), env());
    expect(out.warnings).not.toContain(SIGN_ONLY_KEPT);
    const reports = await verifyPdfSignatures(out.bytes);
    expect(reports).toHaveLength(1);
  });

  it('refuses password protection together with a signature', async () => {
    const { model, blobs } = await setup();
    model.dispatch({
      type: 'protect.set',
      params: {
        enabled: true,
        permissions: DEFAULT_PERMISSIONS,
      },
    });
    await expect(
      exportDocument(model, blobs, options(sig()), env()),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: SIGN_AND_PROTECT_MESSAGE,
    });
  });
});
