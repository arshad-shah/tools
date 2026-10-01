import { describe, expect, it } from 'vitest';
import { degrees, PDFDocument, PDFName, StandardFonts } from 'pdf-lib';
import { makeRotatedPdf, textPositions } from '../../../test/fixtures/builders';
import {
  anchoredOrigin,
  normalizeRotation,
  pageFrame,
  placeBox,
  rotatedOrigin,
  selectPages,
  trySelectPages,
  toPdfPlacement,
  visualSize,
  visualToPdf,
  type PageFrame,
} from './geometry';

const frame = (rotation: 0 | 90 | 180 | 270): PageFrame => ({
  x0: 10,
  y0: 20,
  width: 600,
  height: 800,
  rotation,
});

describe('visualToPdf', () => {
  it.each([
    [0, { x: 10, y: 20 }],
    [90, { x: 610, y: 20 }],
    [180, { x: 610, y: 820 }],
    [270, { x: 10, y: 820 }],
  ] as const)(
    'maps the visual bottom-left corner at /Rotate %i',
    (r, expected) => {
      expect(visualToPdf(frame(r), { x: 0, y: 0 })).toEqual(expected);
    },
  );
  it('maps visual +x along the displayed page width', () => {
    expect(visualToPdf(frame(90), { x: 100, y: 0 })).toEqual({
      x: 610,
      y: 120,
    });
    expect(visualToPdf(frame(270), { x: 100, y: 0 })).toEqual({
      x: 10,
      y: 720,
    });
  });
  it('swaps the visual size for quarter turns', () => {
    expect(visualSize(frame(90))).toEqual({ width: 800, height: 600 });
    expect(visualSize(frame(180))).toEqual({ width: 600, height: 800 });
  });
  it('normalises odd rotations', () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
  });
});

describe('anchors', () => {
  it('places boxes at anchors with a margin', () => {
    const v = { width: 600, height: 800 };
    const box = { width: 100, height: 20 };
    expect(placeBox(v, 'bottom-center', box, 10)).toEqual({ x: 250, y: 10 });
    expect(placeBox(v, 'top-right', box, 10)).toEqual({ x: 490, y: 770 });
    expect(placeBox(v, 'center', box, 10)).toEqual({ x: 250, y: 390 });
  });
  it('centres a rotated box on its anchor', () => {
    const o = rotatedOrigin({ x: 300, y: 400 }, { width: 100, height: 20 }, 90);
    expect(o.x).toBeCloseTo(310);
    expect(o.y).toBeCloseTo(350);
    expect(
      anchoredOrigin(
        { width: 600, height: 800 },
        'center',
        { width: 100, height: 20 },
        0,
        0,
      ),
    ).toEqual({ x: 250, y: 390 });
  });
});

describe('selectPages', () => {
  it('selects all or parsed ranges, sorted and unique', () => {
    expect(selectPages({ mode: 'all' }, 3)).toEqual([0, 1, 2]);
    expect(selectPages({ mode: 'ranges', text: '3, 1-2, 2' }, 3)).toEqual([
      0, 1, 2,
    ]);
    expect(() => selectPages({ mode: 'ranges', text: '' }, 3)).toThrow(
      'Enter at least one page or range',
    );
  });
});

describe('toPdfPlacement on real rotated pages', () => {
  it('draws upright text at the visual bottom-left of a /Rotate 90 page', async () => {
    const doc = await PDFDocument.load(await makeRotatedPdf());
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.getPage(1);
    const f = pageFrame(page);
    const at = toPdfPlacement(
      f,
      anchoredOrigin(
        visualSize(f),
        'bottom-left',
        { width: 30, height: 14 },
        0,
        20,
      ),
      0,
    );
    page.drawText('Mark', {
      x: at.x,
      y: at.y,
      size: 20,
      font,
      rotate: degrees(at.rotate),
    });
    const items = await textPositions(await doc.save(), 1);
    const mark = items.find((i) => i.str === 'Mark')!;
    expect(mark.upright).toBe(true);
    expect(mark.x).toBeCloseTo(20, 0);
    expect(mark.y).toBeCloseTo(mark.viewport.height - 20, 0); // baseline 20pt above the visual bottom
  });
  it('respects the crop box on a /Rotate 270 page', async () => {
    const doc = await PDFDocument.load(await makeRotatedPdf());
    const f = pageFrame(doc.getPage(2));
    expect(f).toEqual({
      x0: 20,
      y0: 30,
      width: 555,
      height: 782,
      rotation: 270,
    });
    expect(visualSize(f)).toEqual({ width: 782, height: 555 });
  });
});

describe('pageFrame matches what viewers show', () => {
  const pageWith = async (
    media: [number, number, number, number],
    crop?: [number, number, number, number],
  ) => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([100, 100]);
    page.node.set(PDFName.of('MediaBox'), doc.context.obj(media));
    if (crop) page.node.set(PDFName.of('CropBox'), doc.context.obj(crop));
    return page;
  };
  it('clips a crop box that is larger than the media box', async () => {
    const f = pageFrame(await pageWith([0, 0, 612, 792], [-50, -50, 700, 900]));
    expect(f).toMatchObject({ x0: 0, y0: 0, width: 612, height: 792 });
  });
  it('normalises inverted boxes', async () => {
    const f = pageFrame(await pageWith([612, 792, 0, 0], [500, 700, 100, 50]));
    expect(f).toMatchObject({ x0: 100, y0: 50, width: 400, height: 650 });
  });
});

describe('trySelectPages', () => {
  it('returns the pages, or the message instead of throwing', () => {
    expect(trySelectPages({ mode: 'ranges', text: '2-3' }, 3)).toEqual({
      pages: [1, 2],
      error: null,
    });
    expect(trySelectPages({ mode: 'ranges', text: '9' }, 3)).toEqual({
      pages: [],
      error: 'Page 9 is out of range (1–3)',
    });
  });
});
