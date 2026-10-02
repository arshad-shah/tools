import { zlibSync } from 'fflate';
import {
  PDFArray,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFRawStream,
  type PDFDocument,
  type PDFObject,
  type PDFRef,
} from 'pdf-lib';
import type { ImageCodec } from '@/pdf/compress/codec';
import type { Box } from '@/pdf/doc/types';
import type { RasterReason } from '@/pdf/edit/content/font-metrics';
import {
  apply,
  corners,
  invert,
  quadBox,
  type Matrix,
} from '@/pdf/edit/content/matrix';
import { resolve } from '@/pdf/edit/content/pdf-obj';
import { coveredBy, overlapFraction } from './geometry';
import { inflate, toComps } from './codec';

export interface DecodedImage {
  width: number;
  height: number;
  comps: 1 | 3;
  pixels: Uint8Array;
  smask?: { pixels: Uint8Array };
}

type Decoded = DecodedImage | { raster: RasterReason };

const get = (doc: PDFDocument, d: PDFDict, key: string) =>
  resolve(doc, d.get(PDFName.of(key)));

const nameText = (o: PDFObject | undefined) =>
  o instanceof PDFName ? o.decodeText() : undefined;

const numberIn = (doc: PDFDocument, d: PDFDict, key: string) => {
  const v = get(doc, d, key);
  return v instanceof PDFNumber ? v.asNumber() : undefined;
};

function filters(doc: PDFDocument, d: PDFDict): string[] {
  const f = get(doc, d, 'Filter');
  if (f instanceof PDFName) return [f.decodeText()];
  if (f instanceof PDFArray)
    return f.asArray().map((x) => nameText(resolve(doc, x)) ?? '?');
  return [];
}

/** Components of a colour space we can paint into (1 or 3), else null. */
export function componentsOf(
  doc: PDFDocument,
  cs: PDFObject | undefined,
): 1 | 3 | null {
  const n = nameText(cs);
  if (n === 'DeviceGray' || n === 'CalGray' || n === 'G') return 1;
  if (n === 'DeviceRGB' || n === 'CalRGB' || n === 'RGB') return 3;
  if (cs instanceof PDFArray) {
    const kind = nameText(resolve(doc, cs.get(0)));
    if (kind === 'CalGray') return 1;
    if (kind === 'CalRGB') return 3;
    if (kind === 'ICCBased') {
      const s = resolve(doc, cs.get(1));
      if (s instanceof PDFRawStream) {
        const comps = numberIn(doc, s.dict, 'N');
        return comps === 1 || comps === 3 ? comps : null;
      }
    }
  }
  return null;
}

/** True for an absent /Decode or the default [0 1 ...]. */
function defaultDecode(doc: PDFDocument, d: PDFDict): boolean {
  const v = get(doc, d, 'Decode');
  if (!v) return true;
  if (!(v instanceof PDFArray)) return false;
  return v.asArray().every((x, i) => {
    const n = resolve(doc, x);
    return n instanceof PDFNumber && n.asNumber() === i % 2;
  });
}

function predictor(doc: PDFDocument, d: PDFDict) {
  let p = get(doc, d, 'DecodeParms');
  if (p instanceof PDFArray) p = resolve(doc, p.get(0));
  if (!(p instanceof PDFDict)) return null;
  return {
    predictor: numberIn(doc, p, 'Predictor') ?? 1,
    colors: numberIn(doc, p, 'Colors') ?? 1,
    columns: numberIn(doc, p, 'Columns') ?? 1,
    bpc: numberIn(doc, p, 'BitsPerComponent') ?? 8,
  };
}

/** 8-bit samples of a Flate or unfiltered stream, or null. */
function samples(
  doc: PDFDocument,
  d: PDFDict,
  data: Uint8Array,
  comps: number,
  width: number,
): Uint8Array | null {
  const f = filters(doc, d);
  if (f.length === 0) return data;
  if (f.length !== 1 || (f[0] !== 'FlateDecode' && f[0] !== 'Fl')) return null;
  const p = predictor(doc, d);
  return inflate(data, p, comps, width);
}

export async function decodeForRedaction(
  doc: PDFDocument,
  stream: PDFRawStream,
  codec: ImageCodec,
): Promise<Decoded> {
  const d = stream.dict;
  const width = numberIn(doc, d, 'Width') ?? 0;
  const height = numberIn(doc, d, 'Height') ?? 0;
  if (!(width > 0 && height > 0)) return { raster: 'image-filter' };
  const mask = get(doc, d, 'ImageMask');
  if (mask && mask.toString() === 'true') return { raster: 'image-colorspace' };
  if (numberIn(doc, d, 'BitsPerComponent') !== 8)
    return { raster: 'image-colorspace' };
  const comps = componentsOf(doc, get(doc, d, 'ColorSpace'));
  if (!comps) return { raster: 'image-colorspace' };
  const f = filters(doc, d);
  let pixels: Uint8Array | null;
  if (f.length === 1 && (f[0] === 'DCTDecode' || f[0] === 'DCT')) {
    if (!defaultDecode(doc, d) || get(doc, d, 'DecodeParms'))
      return { raster: 'image-filter' };
    try {
      const raw = await codec.decodeJpeg(stream.contents);
      if (raw.width !== width || raw.height !== height)
        return { raster: 'image-filter' };
      pixels = toComps(raw, comps);
    } catch {
      return { raster: 'image-filter' };
    }
  } else {
    if (!defaultDecode(doc, d)) return { raster: 'image-filter' };
    pixels = samples(doc, d, stream.contents, comps, width);
  }
  if (!pixels || pixels.length < width * height * comps)
    return { raster: 'image-filter' };
  const out: DecodedImage = {
    width,
    height,
    comps,
    pixels: pixels.slice(0, width * height * comps),
  };
  const smask = get(doc, d, 'SMask');
  if (smask instanceof PDFRawStream) {
    const sw = numberIn(doc, smask.dict, 'Width');
    const sh = numberIn(doc, smask.dict, 'Height');
    if (
      sw !== width ||
      sh !== height ||
      numberIn(doc, smask.dict, 'BitsPerComponent') !== 8
    )
      return { raster: 'image-filter' };
    const sp = samples(doc, smask.dict, smask.contents, 1, width);
    if (!sp || sp.length < width * height) return { raster: 'image-filter' };
    out.smask = { pixels: sp.slice(0, width * height) };
  }
  return out;
}

export type Rgb = [number, number, number];

/** Overlap below this many square points counts as touching, not covering. */
const TOUCH = 1e-6;

/**
 * Paints every image pixel whose footprint (its page-space bounding box)
 * overlaps a mark, so a mark smaller than one pixel of an upscaled image
 * still paints that pixel. `fill` is one colour, or one per mark (by
 * index). Returns how many pixels were painted.
 */
export function paintCovered(
  img: DecodedImage,
  ctm: Matrix,
  marks: readonly Box[],
  fill: Rgb | readonly Rgb[],
): number {
  const { width: W, height: H, comps, pixels } = img;
  const perMark = Array.isArray(fill[0]);
  const fillOf = (i: number): Rgb =>
    perMark
      ? ((fill as readonly Rgb[])[i] ?? (fill as readonly Rgb[])[0])
      : (fill as Rgb);
  // Only scan the pixel window that can intersect a mark.
  const inv = invert(ctm);
  let painted = 0;
  for (const [mi, m] of marks.entries()) {
    const rgb = fillOf(mi);
    const gray = Math.round(
      0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2],
    );
    const pts = [
      [m.x, m.y],
      [m.x + m.width, m.y],
      [m.x, m.y + m.height],
      [m.x + m.width, m.y + m.height],
    ].map(([x, y]) => apply(inv, x, y));
    const us = pts.map((c) => c[0]);
    const vs = pts.map((c) => c[1]);
    const px0 = Math.max(0, Math.floor(Math.min(...us) * W) - 1);
    const px1 = Math.min(W - 1, Math.ceil(Math.max(...us) * W) + 1);
    const py0 = Math.max(0, Math.floor((1 - Math.max(...vs)) * H) - 1);
    const py1 = Math.min(H - 1, Math.ceil((1 - Math.min(...vs)) * H) + 1);
    for (let py = py0; py <= py1; py++)
      for (let px = px0; px <= px1; px++) {
        const foot = quadBox(
          corners(ctm, px / W, 1 - (py + 1) / H, (px + 1) / W, 1 - py / H),
        );
        const ow =
          Math.min(foot.x + foot.width, m.x + m.width) - Math.max(foot.x, m.x);
        const oh =
          Math.min(foot.y + foot.height, m.y + m.height) -
          Math.max(foot.y, m.y);
        if (!(ow > 0 && oh > 0 && ow * oh > TOUCH)) continue;
        const o = (py * W + px) * comps;
        if (comps === 1) pixels[o] = gray;
        else {
          pixels[o] = rgb[0];
          pixels[o + 1] = rgb[1];
          pixels[o + 2] = rgb[2];
        }
        if (img.smask) img.smask.pixels[py * W + px] = 255;
        painted++;
      }
  }
  return painted;
}

export function imageCoverage(
  ctm: Matrix,
  marks: readonly Box[],
): 'none' | 'partial' | 'full' {
  const box = quadBox(corners(ctm, 0, 0, 1, 1));
  if (!marks.some((m) => overlapFraction(box, m) > 0)) return 'none';
  return coveredBy(box, marks) ? 'full' : 'partial';
}

/**
 * A new image XObject holding the patched pixels (the original is left
 * untouched for other users): JPEG when the original was DCT, else Flate.
 */
export async function encodeReplacement(
  doc: PDFDocument,
  original: PDFRawStream,
  img: DecodedImage,
  codec: ImageCodec,
): Promise<PDFRef> {
  const d = original.dict;
  const wasDct = filters(doc, d).some((f) => f === 'DCTDecode' || f === 'DCT');
  const sameCs = d.get(PDFName.of('ColorSpace'));
  const base = {
    Type: 'XObject',
    Subtype: 'Image',
    Width: img.width,
    Height: img.height,
    BitsPerComponent: 8,
  };
  let bytes: Uint8Array;
  let extra: Record<string, unknown>;
  if (wasDct) {
    const enc = await codec.encodeJpeg(
      {
        width: img.width,
        height: img.height,
        channels: img.comps,
        pixels: img.pixels,
      },
      0.92,
    );
    bytes = enc.bytes;
    extra = {
      Filter: 'DCTDecode',
      ColorSpace:
        enc.channels === img.comps && sameCs
          ? sameCs
          : enc.channels === 1
            ? 'DeviceGray'
            : 'DeviceRGB',
    };
  } else {
    bytes = zlibSync(img.pixels);
    extra = {
      Filter: 'FlateDecode',
      ColorSpace: sameCs ?? (img.comps === 1 ? 'DeviceGray' : 'DeviceRGB'),
    };
  }
  const dict: Record<string, unknown> = { ...base, ...extra };
  if (img.smask) {
    const sm = doc.context.flateStream(img.smask.pixels, {
      Type: 'XObject',
      Subtype: 'Image',
      Width: img.width,
      Height: img.height,
      ColorSpace: 'DeviceGray',
      BitsPerComponent: 8,
    });
    dict.SMask = doc.context.register(sm);
  }
  const stream = PDFRawStream.of(
    doc.context.obj(dict as never) as unknown as PDFDict,
    bytes,
  );
  stream.dict.set(PDFName.of('Length'), PDFNumber.of(bytes.length));
  return doc.context.register(stream);
}
