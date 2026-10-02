import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  decodedObjects,
  imagePlacements,
  makeTextPdf,
  textPositions,
} from '../../../../test/fixtures/builders';
import { encodePng, noiseImage } from '../../../../test/fixtures/images';
import { ALL_MATERIALIZERS } from '../materialize';
import { materialize, type MaterializePlan } from '../materialize/materialize';
import { registerMaterializers } from '../materialize/registry';
import { summarizeChanges } from '../summary';
import { makeModel } from '../test-helpers';
import type { OverlayItem } from '../types';
import { registerCoreOperations } from '.';
import { lineEnds, lineFrame } from './edit';

vi.mock('@/shared/lib/image-convert', () => ({
  convertToPng: vi.fn(async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1])),
}));

registerCoreOperations();
registerMaterializers(ALL_MATERIALIZERS);

const P0 = 'ckpt0:0';
let base: Uint8Array;
let png: Uint8Array;
beforeAll(async () => {
  base = await makeTextPdf({ pages: 1, label: 'Alpha' });
  png = encodePng(40, 20, noiseImage(40, 20, 4, 3));
});

const rpc = () => ({
  signal: new AbortController().signal,
  progress: () => {},
});
const plan = (
  overlays: OverlayItem[],
  assets: Record<string, Uint8Array> = {},
): MaterializePlan => ({
  base,
  baseSourceId: 's0',
  sources: {},
  assets,
  pages: [{ id: P0, source: 's0', index: 0, rotate: 0 }],
  pageLabels: null,
  overlays,
});
const itemsOf = (model: ReturnType<typeof makeModel>) =>
  [...model.getView().overlays.values()].flat();

const textOp = (patch: Record<string, unknown> = {}) => ({
  type: 'content.text',
  params: {
    id: 'x1',
    pageId: P0,
    rect: { x: 100, y: 500, width: 200, height: 40 },
    rotate: 0,
    text: 'Hello',
    font: 'Helvetica',
    size: 14,
    color: '#000000',
    align: 'left',
    lineHeight: 1.2,
    ...patch,
  },
});

describe('edit content ops', () => {
  it('labels and summaries', () => {
    const model = makeModel();
    expect(model.dispatch(textOp())[0].label).toBe('Add text on page 1');
    model.dispatch({
      type: 'content.image',
      params: {
        id: 'i',
        pageId: P0,
        rect: { x: 1, y: 1, width: 2, height: 2 },
        rotate: 0,
        assetId: 'a',
        mime: 'image/png',
        opacity: 1,
        keepAspect: true,
      },
    });
    const [shape] = model.dispatch({
      type: 'content.shape',
      params: {
        id: 's',
        pageId: P0,
        kind: 'arrow',
        ...lineFrame([10, 10], [100, 50], 2),
        stroke: '#ff0000',
        fill: null,
        width: 2,
        opacity: 1,
        rotate: 0,
      },
    });
    expect(shape.label).toBe('Add arrow on page 1');
    expect(summarizeChanges(model.getState(), model.getView())[0]).toEqual({
      mode: 'edit',
      lines: ['1 text box', '1 image', '1 shape'],
    });
  });

  it('refuses empty text and shapes without paint', () => {
    const model = makeModel();
    expect(() => model.dispatch(textOp({ text: '  ' }))).toThrow(
      /type some text/,
    );
    expect(() =>
      model.dispatch({
        type: 'content.shape',
        params: {
          id: 's',
          pageId: P0,
          kind: 'rect',
          rect: { x: 1, y: 1, width: 2, height: 2 },
          stroke: null,
          fill: null,
          width: 1,
          opacity: 1,
          rotate: 0,
        },
      }),
    ).toThrow(/fill or a stroke/);
  });

  it('line ends follow the rect when it moves', () => {
    const frame = lineFrame([10, 10], [100, 50], 2);
    const p = { kind: 'line' as const, ...frame } as Parameters<
      typeof lineEnds
    >[0];
    const [a, b] = lineEnds(p);
    expect(a[0]).toBeCloseTo(10);
    expect(b[1]).toBeCloseTo(50);
    const moved = lineEnds({ ...p, rect: { ...p.rect, x: p.rect.x + 5 } });
    expect(moved[0][0]).toBeCloseTo(15);
  });
});

describe('edit content writers', () => {
  it('text lands in its rect', async () => {
    const model = makeModel();
    model.dispatch(textOp());
    const out = await materialize(plan(itemsOf(model)), rpc());
    const hello = (await textPositions(out.bytes, 0)).find(
      (t) => t.str === 'Hello',
    )!;
    // Screen y is 792 - page y; the baseline sits inside the 500..540 box.
    expect(hello.x).toBeGreaterThanOrEqual(100);
    expect(hello.x).toBeLessThan(110);
    expect(792 - hello.y).toBeGreaterThan(500);
    expect(792 - hello.y).toBeLessThan(540);
    expect(hello.upright).toBe(true);
  });

  it('rotated text (90) lands in its rect', async () => {
    const model = makeModel();
    model.dispatch(
      textOp({ rotate: 90, rect: { x: 200, y: 300, width: 120, height: 30 } }),
    );
    const out = await materialize(plan(itemsOf(model)), rpc());
    const hello = (await textPositions(out.bytes, 0)).find(
      (t) => t.str === 'Hello',
    )!;
    expect(Math.round(hello.angle)).toBe(90);
    // The turned box spans x 245..275 and y 255..365 in page space.
    expect(hello.x).toBeGreaterThan(240);
    expect(hello.x).toBeLessThan(280);
    expect(792 - hello.y).toBeGreaterThan(250);
    expect(792 - hello.y).toBeLessThan(370);
  });

  it('unsupported characters name the Unicode font fix', async () => {
    const model = makeModel();
    model.dispatch(textOp({ text: String.fromCodePoint(0x0141) + 'odz' }));
    await expect(materialize(plan(itemsOf(model)), rpc())).rejects.toThrow(
      /Use the Unicode font/,
    );
  });

  it('an image is placed in its rect', async () => {
    const model = makeModel();
    model.dispatch({
      type: 'content.image',
      params: {
        id: 'i',
        pageId: P0,
        rect: { x: 100, y: 100, width: 80, height: 40 },
        rotate: 0,
        assetId: 'a1',
        mime: 'image/png',
        opacity: 1,
        keepAspect: true,
      },
    });
    const out = await materialize(plan(itemsOf(model), { a1: png }), rpc());
    const [img] = await imagePlacements(out.bytes, 0);
    expect(img.left).toBeCloseTo(100);
    expect(img.top).toBeCloseTo(792 - 140);
    expect(img.width).toBeCloseTo(80);
    expect(img.height).toBeCloseTo(40);
  });

  it('shapes are paths, not text', async () => {
    const model = makeModel();
    for (const kind of ['rect', 'ellipse'] as const)
      model.dispatch({
        type: 'content.shape',
        params: {
          id: kind,
          pageId: P0,
          kind,
          rect: { x: 100, y: 100, width: 80, height: 40 },
          stroke: '#ff0000',
          fill: '#00ff00',
          width: 2,
          opacity: 1,
          rotate: 0,
        },
      });
    for (const kind of ['line', 'arrow'] as const)
      model.dispatch({
        type: 'content.shape',
        params: {
          id: kind,
          pageId: P0,
          kind,
          ...lineFrame([100, 300], [300, 350], 2),
          stroke: '#0000ff',
          fill: null,
          width: 2,
          opacity: 1,
          rotate: 0,
        },
      });
    const out = await materialize(plan(itemsOf(model)), rpc());
    expect((await textPositions(out.bytes, 0)).map((t) => t.str)).toEqual([
      'Alpha 1',
    ]);
    const objects = await decodedObjects(out.bytes);
    expect(objects).toMatch(/ re\b/);
    expect(objects).toMatch(/ c\b/);
    expect(objects).toMatch(/ l\b/);
  });
});

describe('toEmbeddable', () => {
  it('passes PNG and JPEG through and converts WebP and GIF to PNG', async () => {
    const { toEmbeddable } = await import('@/pdf/edit/images');
    const { convertToPng } = await import('@/shared/lib/image-convert');
    expect(await toEmbeddable(png)).toEqual({ bytes: png, mime: 'image/png' });
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
    expect((await toEmbeddable(jpeg)).mime).toBe('image/jpeg');
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]);
    const out = await toEmbeddable(webp, 'a.webp');
    expect(out.mime).toBe('image/png');
    expect(convertToPng).toHaveBeenCalledWith(webp, 'webp', 'a.webp');
    await expect(toEmbeddable(new Uint8Array([1, 2, 3]))).rejects.toMatchObject(
      {
        code: 'INVALID_FILE',
      },
    );
  });
});

describe('content.update', () => {
  it('patches a pending object in the view and is not a change of its own', () => {
    const model = makeModel();
    const [text] = model.dispatch(textOp());
    const [upd] = model.dispatch({
      type: 'content.update',
      params: { targetId: text.id, patch: { font: 'unicode', size: 20 } },
    });
    expect(upd.label).toBe('Edit object on page 1');
    const item = [...model.getView().overlays.values()]
      .flat()
      .find((o) => o.opId === text.id)!;
    expect(item.params).toMatchObject({
      font: 'unicode',
      size: 20,
      text: 'Hello',
    });
    expect(
      summarizeChanges(model.getState(), model.getView())[0].lines,
    ).toEqual(['1 text box']);
  });
  it('refuses a bad patch and geometry keys', () => {
    const model = makeModel();
    const [text] = model.dispatch(textOp());
    expect(() =>
      model.dispatch({
        type: 'content.update',
        params: { targetId: text.id, patch: { size: -1 } },
      }),
    ).toThrow();
    expect(() =>
      model.dispatch({
        type: 'content.update',
        params: { targetId: text.id, patch: { rect: {} } },
      }),
    ).toThrow(/cannot change/);
  });
});
