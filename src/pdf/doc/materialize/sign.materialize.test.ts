import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  imagePlacements,
  makeTextPdf,
  textPositions,
} from '../../../../test/fixtures/builders';
import { encodePng } from '../../../../test/fixtures/images';
import { registerCoreOperations } from '../ops';
import type { OverlayItem, PageRef } from '../types';
import { ALL_MATERIALIZERS } from '.';
import { materialize, type MaterializePlan } from './materialize';
import { registerMaterializers } from './registry';

beforeAll(() => {
  registerCoreOperations();
  registerMaterializers(ALL_MATERIALIZERS);
});

const rpc = () => ({
  signal: new AbortController().signal,
  progress: () => {},
});
const page = (id: string, index: number): PageRef => ({
  id,
  source: 's0',
  index,
  rotate: 0,
});
const item = (type: string, pageId: string | null, params: unknown) =>
  ({ opId: `op-${Math.random()}`, type, pageId, params }) as OverlayItem;

function run(
  base: Uint8Array,
  overlays: OverlayItem[],
  patch: Partial<MaterializePlan> = {},
) {
  return materialize(
    {
      base,
      baseSourceId: 's0',
      sources: {},
      assets: {},
      pages: [page('p0', 0)],
      pageLabels: null,
      overlays,
      ...patch,
    },
    rpc(),
  );
}

async function operators(bytes: Uint8Array, pageIndex = 0) {
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const p = await (await task.promise).getPage(pageIndex + 1);
    return await p.getOperatorList();
  } finally {
    await task.destroy();
  }
}

const VECTOR = {
  d: 'M2 10C2 4 8 2 14 6C20 10 26 10 30 4C30 12 22 16 14 14C8 12 4 14 2 10Z',
  width: 32,
  height: 18,
};
const RECT = { x: 100, y: 100, width: 200, height: 60 };
const font = () =>
  new Uint8Array(
    readFileSync(
      'node_modules/@fontsource/caveat/files/caveat-latin-400-normal.woff',
    ),
  );

let base: Uint8Array;
beforeAll(async () => {
  base = await makeTextPdf({ pages: 1, label: 'Form' });
});

describe('ink and traced signatures', () => {
  for (const kind of ['ink', 'trace'] as const)
    it(`writes ${kind} as a filled vector path, no image or text`, async () => {
      const out = await run(base, [
        item('sign.place', 'p0', {
          id: 's',
          pageId: 'p0',
          rect: RECT,
          rotate: 0,
          role: 'signature',
          content: { kind, vector: VECTOR, color: '#1d4ed8' },
        }),
      ]);
      const ops = await operators(out.bytes);
      const fills = ops.fnArray
        .map((fn, i) => (fn === OPS.constructPath ? ops.argsArray[i][0] : null))
        .filter((op) => op !== null);
      expect(fills).toContain(kind === 'ink' ? OPS.fill : OPS.eoFill);
      expect(ops.fnArray).not.toContain(OPS.paintImageXObject);
      expect((await textPositions(out.bytes, 0)).map((t) => t.str)).toEqual([
        'Form 1',
      ]);
    });

  it('fits the vector in the box, turned with the page', async () => {
    const doc = await PDFDocument.load(base);
    doc.getPage(0).setRotation({ type: 'degrees', angle: 90 } as never);
    const out = await run(await doc.save(), [
      item('sign.place', 'p0', {
        id: 's',
        pageId: 'p0',
        rect: { x: 300, y: 300, width: 60, height: 200 },
        rotate: 0,
        role: 'signature',
        content: { kind: 'ink', vector: VECTOR, color: '#111827' },
      }),
    ]);
    const ops = await operators(out.bytes);
    const transforms = ops.fnArray
      .map((fn, i) => (fn === OPS.transform ? ops.argsArray[i] : null))
      .filter(Boolean) as number[][];
    // One combined matrix: a quarter turn of the y-flipped fit.
    const m = transforms[transforms.length - 1];
    expect(Math.abs(m[0])).toBeLessThan(1e-6);
    expect(Math.abs(m[1])).toBeGreaterThan(1);
  });
});

describe('typed signatures', () => {
  it('slants the text with a shear of tan(slant)', async () => {
    const out = await run(
      base,
      [
        item('sign.place', 'p0', {
          id: 's',
          pageId: 'p0',
          rect: RECT,
          rotate: 0,
          role: 'signature',
          content: {
            kind: 'text',
            text: 'Jane Doe',
            fontId: 'caveat',
            fontAsset: 'f1',
            color: '#111827',
            slant: 15,
          },
        }),
      ],
      { assets: { f1: font() } },
    );
    const texts = (await textPositions(out.bytes, 0)).map((t) => t.str);
    expect(texts).toContain('Jane Doe');
    const ops = await operators(out.bytes);
    const shear = ops.fnArray.some(
      (fn, i) =>
        fn === OPS.transform &&
        Math.abs(ops.argsArray[i][2] - Math.tan((15 * Math.PI) / 180)) < 1e-3,
    );
    expect(shear).toBe(true);
  });
});

describe('signature blocks', () => {
  it('writes the signature, then name, title and date in the block', async () => {
    const out = await run(base, [
      item('sign.block', 'p0', {
        id: 'b',
        pageId: 'p0',
        rect: { x: 100, y: 100, width: 240, height: 120 },
        rotate: 0,
        content: {
          signature: { kind: 'ink', vector: VECTOR, color: '#111827' },
          name: 'Ada Lovelace',
          title: 'Analyst',
          dateIso: '2026-10-01',
          locale: 'en-GB',
          showDate: true,
        },
      }),
    ]);
    const lines = (await textPositions(out.bytes, 0)).filter(
      (t) => t.str !== 'Form 1',
    );
    expect(lines.map((t) => t.str)).toEqual([
      'Ada Lovelace',
      'Analyst',
      '1 October 2026',
    ]);
    for (const t of lines) {
      const baseline = 792 - t.y;
      expect(baseline).toBeGreaterThan(100);
      expect(baseline).toBeLessThan(100 + 120 * 0.45);
      expect(t.size).toBeGreaterThanOrEqual(6);
    }
    const ops = await operators(out.bytes);
    expect(ops.fnArray).toContain(OPS.constructPath);
  });
});

describe('initials on chosen pages', () => {
  it('lands at the same relative spot on pages of different sizes', async () => {
    const doc = await PDFDocument.create();
    const sizes: [number, number][] = [
      [612, 792],
      [300, 400],
      [842, 595],
    ];
    for (const s of sizes) doc.addPage(s);
    const png = encodePng(4, 2, new Uint8Array(4 * 2 * 4).fill(40));
    const anchor = { fx: 0.8, fy: 0.05, fw: 0.12, fh: 0.04 };
    const out = await run(
      await doc.save(),
      [
        item('sign.initialPages', null, {
          id: 'i',
          pageIds: ['p0', 'p1', 'p2'],
          anchor,
          content: { kind: 'image', assetId: 'a1', mime: 'image/png' },
        }),
      ],
      {
        pages: [page('p0', 0), page('p1', 1), page('p2', 2)],
        assets: { a1: png },
      },
    );
    for (let i = 0; i < 3; i++) {
      const [img] = await imagePlacements(out.bytes, i);
      const { width: w, height: h } = img.viewport;
      expect(img.left / w).toBeCloseTo(anchor.fx, 2);
      expect((h - img.top - img.height) / h).toBeCloseTo(anchor.fy, 2);
      expect(img.width / w).toBeCloseTo(anchor.fw, 2);
      expect(img.height / h).toBeCloseTo(anchor.fh, 2);
    }
  });

  it('skips pages that are not exported', async () => {
    const out = await run(base, [
      item('sign.initialPages', null, {
        id: 'i',
        pageIds: ['p0', 'gone'],
        anchor: { fx: 0.1, fy: 0.1, fw: 0.1, fh: 0.1 },
        content: { kind: 'ink', vector: VECTOR, color: '#111827' },
      }),
    ]);
    expect((await operators(out.bytes)).fnArray).toContain(OPS.constructPath);
  });
});
