import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  imagePlacements,
  makeFormPdf,
  makeTextPdf,
  textPositions,
} from '../../../../test/fixtures/builders';
import { encodePng } from '../../../../test/fixtures/images';
import { listFormFields } from '@/pdf/edit/forms';
import { registerCoreOperations } from '../ops';
import type { OverlayItem, PageRef } from '../types';
import { ALL_MATERIALIZERS } from '.';
import { materialize, type MaterializePlan } from './materialize';
import { registerMaterializers } from './registry';

beforeAll(() => {
  registerCoreOperations();
  registerMaterializers(ALL_MATERIALIZERS);
});

const ctx = () => ({
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

async function run(
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
    ctx(),
  );
}

const RECT = { x: 100, y: 600, width: 200, height: 20 };
const fill = (value: string, extra: object = {}) =>
  item('flat.fill', 'p0', {
    id: 'f',
    pageId: 'p0',
    rect: RECT,
    kind: 'text',
    value,
    ...extra,
  });

let base: Uint8Array;
beforeAll(async () => {
  base = await makeTextPdf({ pages: 1, label: 'Form' });
});

describe('fill-sign writers', () => {
  it('draws flat text inside its rect', async () => {
    const out = await run(base, [fill('Doe')]);
    const doe = (await textPositions(out.bytes, 0)).find(
      (t) => t.str === 'Doe',
    );
    expect(doe).toBeDefined();
    const baseline = 792 - doe!.y;
    expect(doe!.x).toBeGreaterThanOrEqual(RECT.x);
    expect(doe!.x).toBeLessThan(RECT.x + RECT.width);
    expect(baseline).toBeGreaterThan(RECT.y);
    expect(baseline).toBeLessThan(RECT.y + RECT.height);
    expect(out.notes).toEqual([]);
  });

  it('a tick draws no text', async () => {
    const out = await run(base, [
      fill('yes', {
        kind: 'tick',
        rect: { x: 100, y: 600, width: 10, height: 10 },
      }),
    ]);
    const texts = (await textPositions(out.bytes, 0)).map((t) => t.str);
    expect(texts).toEqual(['Form 1']);
  });

  it('shrinks long text to at least 6pt and notes the cut', async () => {
    const out = await run(base, [
      fill('x'.repeat(200), {
        rect: { x: 100, y: 600, width: 100, height: 12 },
      }),
    ]);
    const t = (await textPositions(out.bytes, 0)).find((p) =>
      p.str.startsWith('xxx'),
    );
    expect(t!.size).toBeGreaterThanOrEqual(6);
    expect(out.notes).toEqual([
      'Text in a field on page 1 was too long and was cut',
    ]);
  });

  it('skips cleared fields', async () => {
    const out = await run(base, [fill('')]);
    expect((await textPositions(out.bytes, 0)).map((t) => t.str)).toEqual([
      'Form 1',
    ]);
  });

  it('writes text upright on a quarter-turned page', async () => {
    const doc = await PDFDocument.load(base);
    doc.getPage(0).setRotation({ type: 'degrees', angle: 90 } as never);
    const rotated = await doc.save();
    const out = await run(rotated, [
      fill('Upright', { rect: { x: 300, y: 300, width: 20, height: 200 } }),
    ]);
    const t = (await textPositions(out.bytes, 0)).find(
      (p) => p.str === 'Upright',
    );
    expect(t?.upright).toBe(true);
  });

  it('form.setValue fills the AcroForm field', async () => {
    const out = await run(await makeFormPdf(), [
      item('form.setValue', null, { name: 'name', value: 'Ada' }),
      item('form.setValue', null, { name: 'agree', value: true }),
    ]);
    const fields = await listFormFields(out.bytes);
    expect(fields.find((f) => f.name === 'name')).toMatchObject({
      value: 'Ada',
    });
    expect(fields.find((f) => f.name === 'agree')).toMatchObject({
      checked: true,
    });
  });

  it('places a signature image inside its rect', async () => {
    const png = encodePng(4, 2, new Uint8Array(4 * 2 * 4).fill(40));
    const out = await run(
      base,
      [
        item('sign.place', 'p0', {
          id: 's',
          pageId: 'p0',
          rect: RECT,
          rotate: 0,
          role: 'signature',
          content: { kind: 'image', assetId: 'a1', mime: 'image/png' },
        }),
      ],
      { assets: { a1: png } },
    );
    const [img] = await imagePlacements(out.bytes, 0);
    expect(img.left).toBeCloseTo(RECT.x);
    expect(img.top).toBeCloseTo(792 - RECT.y - RECT.height);
    expect(img.width).toBeCloseTo(RECT.width);
    expect(img.height).toBeCloseTo(RECT.height);
  });

  it('draws a typed signature inside its rect', async () => {
    const font = new Uint8Array(
      readFileSync(
        'node_modules/@fontsource/caveat/files/caveat-latin-400-normal.woff',
      ),
    );
    const out = await run(
      base,
      [
        item('sign.place', 'p0', {
          id: 's',
          pageId: 'p0',
          rect: { x: 100, y: 100, width: 200, height: 50 },
          rotate: 0,
          role: 'signature',
          content: {
            kind: 'text',
            text: 'Jane Doe',
            fontId: 'caveat',
            fontAsset: 'f1',
            color: '#1e3a8a',
          },
        }),
      ],
      { assets: { f1: font } },
    );
    const t = (await textPositions(out.bytes, 0)).find(
      (p) => p.str === 'Jane Doe',
    );
    expect(t).toBeDefined();
    expect(t!.x).toBeGreaterThanOrEqual(100);
    expect(792 - t!.y).toBeGreaterThan(100);
    expect(792 - t!.y).toBeLessThan(150);
  });
});

describe('styled flat fills', () => {
  it('writes comb text one character per cell', async () => {
    const out = await run(base, [
      fill('20261002', {
        rect: { x: 100, y: 600, width: 160, height: 20 },
        comb: 8,
        color: '#1e3a8a',
      }),
    ]);
    const xs = (await textPositions(out.bytes, 0))
      .filter((t) => /^\d$/.test(t.str))
      .map((t) => t.x)
      .sort((a, b) => a - b);
    expect(xs).toHaveLength(8);
    xs.slice(1).forEach((x, i) => expect(x - xs[i]).toBeCloseTo(20, 1));
  });
});
