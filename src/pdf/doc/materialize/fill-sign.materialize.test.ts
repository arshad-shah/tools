import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PDFDocument, PDFName } from 'pdf-lib';
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

/** Text fields with auto (0) size, a set 9pt size, and 9 comb boxes. */
async function makeSizedFormPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const form = doc.getForm();
  // Real forms say "auto" with a 0 size: /Helv 0 Tf.
  const auto = form.createTextField('auto');
  auto.addToPage(page, { x: 72, y: 700, width: 240, height: 25 });
  auto.acroField.setDefaultAppearance('/Helv 0 Tf 0 g');
  const notes = form.createTextField('notes');
  notes.enableMultiline();
  notes.addToPage(page, { x: 72, y: 560, width: 400, height: 120 });
  notes.acroField.setDefaultAppearance('/Helv 0 Tf 0 g');
  const sized = form.createTextField('sized');
  sized.addToPage(page, { x: 72, y: 500, width: 240, height: 25 });
  sized.setFontSize(9);
  const ssn = form.createTextField('ssn');
  ssn.setMaxLength(9);
  ssn.enableCombing();
  ssn.addToPage(page, { x: 72, y: 440, width: 180, height: 20 });
  // Without this, pdf-lib's save swaps the auto (0) sizes for fitted ones.
  return doc.save({ updateFieldAppearances: false });
}

/** A field's DA font size in the exported file. */
async function daSize(bytes: Uint8Array, name: string): Promise<number> {
  const doc = await PDFDocument.load(bytes);
  const da = doc.getForm().getTextField(name).acroField.getDefaultAppearance();
  return Number(/([\d.]+)\s+Tf/.exec(da ?? '')?.[1] ?? NaN);
}

describe('form values that once failed the whole export', () => {
  it('cuts text to the field limit instead of failing', async () => {
    // The I-9's middle initial allows one character.
    const out = await run(await makeSizedFormPdf(), [
      item('form.setValue', null, { name: 'ssn', value: '123-45-678999' }),
    ]);
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getForm().getTextField('ssn').getText()).toBe('123-45-67');
  });

  /** Exports one value into the 'auto' field, fonts read from node_modules. */
  async function exportText(value: string) {
    // The app fetches its bundled Noto Sans; read it from node_modules here.
    vi.stubGlobal('fetch', async (url: string) => {
      const file = String(url).replace(/^.*node_modules\//, 'node_modules/');
      return new Response(new Uint8Array(readFileSync(file)));
    });
    const out = await run(await makeSizedFormPdf(), [
      item('form.setValue', null, { name: 'auto', value }),
    ]).finally(() => vi.unstubAllGlobals());
    const doc = await PDFDocument.load(out.bytes);
    const field = doc.getForm().getTextField('auto');
    return {
      text: field.getText(),
      appearance: !!field.acroField.getWidgets()[0].dict.get(PDFName.of('AP')),
      needAppearances: String(
        doc.getForm().acroForm.dict.get(PDFName.of('NeedAppearances')),
      ),
    };
  }

  it('draws text Helvetica lacks with a Unicode font that has it all', async () => {
    expect(await exportText('Αθήνα')).toMatchObject({
      text: 'Αθήνα',
      appearance: true,
    });
  });

  it('leaves mixed-script text for the viewer to draw rather than failing', async () => {
    // No one font has both "Ł" (Latin Extended) and the basic Latin here.
    expect(await exportText('Łódź – Zoë Ñúñez')).toMatchObject({
      text: 'Łódź – Zoë Ñúñez',
      needAppearances: 'true',
    });
  });
});

describe('form text size', () => {
  it('writes an auto-size field at the size the editor previews (not box-filling)', async () => {
    const out = await run(await makeSizedFormPdf(), [
      item('form.setValue', null, { name: 'auto', value: 'Mr' }),
      item('form.setValue', null, {
        name: 'notes',
        value:
          'Flight cancelled by airline due to a storm. Rebooking was not possible.',
      }),
    ]);
    // The editor shows min(11, 75% of the box height).
    expect(await daSize(out.bytes, 'auto')).toBe(11);
    expect(await daSize(out.bytes, 'notes')).toBe(11);
  });

  it("keeps a field's own font size", async () => {
    const out = await run(await makeSizedFormPdf(), [
      item('form.setValue', null, { name: 'sized', value: 'x' }),
    ]);
    expect(await daSize(out.bytes, 'sized')).toBe(9);
  });

  it('shrinks the auto size for a short box', async () => {
    const doc = await PDFDocument.load(await makeSizedFormPdf());
    const f = doc.getForm().createTextField('tiny');
    f.addToPage(doc.getPage(0), { x: 300, y: 300, width: 100, height: 10 });
    f.acroField.setDefaultAppearance('/Helv 0 Tf 0 g');
    const out = await run(await doc.save({ updateFieldAppearances: false }), [
      item('form.setValue', null, { name: 'tiny', value: 'x' }),
    ]);
    // pdf-lib pads the widget by its 1pt border: 11pt tall, so 8.25pt.
    expect(await daSize(out.bytes, 'tiny')).toBe(8.25);
  });
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

  it('places a signature image inside its rect, its shape kept and centred', async () => {
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
    // A 2:1 picture, as large as fits, never stretched to the rect.
    expect(img.width / img.height).toBeCloseTo(2);
    const top = 792 - RECT.y - RECT.height;
    expect(img.left).toBeGreaterThanOrEqual(RECT.x - 0.01);
    expect(img.top).toBeGreaterThanOrEqual(top - 0.01);
    expect(img.left + img.width).toBeLessThanOrEqual(
      RECT.x + RECT.width + 0.01,
    );
    expect(img.top + img.height).toBeLessThanOrEqual(top + RECT.height + 0.01);
    expect(
      Math.max(img.width / RECT.width, img.height / RECT.height),
    ).toBeCloseTo(1);
    expect(img.left - RECT.x).toBeCloseTo(
      RECT.x + RECT.width - img.left - img.width,
    );
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
