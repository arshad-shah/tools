import { zlibSync } from 'fflate';
import type { Box } from '@/pdf/doc/types';
import type { RasterReason } from '@/pdf/edit/content/font-metrics';
import type { Matrix } from '@/pdf/edit/content/matrix';
import type { ContentOp, Tok } from '@/pdf/edit/content/tokens';
import { inflate } from './codec';
import { paintCovered, type Rgb } from './images';

const pick = (d: Map<string, Tok>, ...keys: string[]) => {
  for (const k of keys) if (d.has(k)) return d.get(k);
  return undefined;
};

const FILTERS: Record<string, string> = {
  Fl: 'Fl',
  FlateDecode: 'Fl',
  AHx: 'AHx',
  ASCIIHexDecode: 'AHx',
};

function fromHex(b: Uint8Array): Uint8Array | null {
  const out: number[] = [];
  let hi = -1;
  for (const c of b) {
    if (c === 0x3e) break;
    const v = parseInt(String.fromCharCode(c), 16);
    if (Number.isNaN(v)) {
      if (c <= 0x20) continue;
      return null;
    }
    if (hi < 0) hi = v;
    else {
      out.push((hi << 4) | v);
      hi = -1;
    }
  }
  if (hi >= 0) out.push(hi << 4);
  return Uint8Array.from(out);
}

function toHex(b: Uint8Array): Uint8Array {
  const out = new Uint8Array(b.length * 2 + 1);
  const H = '0123456789ABCDEF';
  b.forEach((x, i) => {
    out[2 * i] = H.charCodeAt(x >> 4);
    out[2 * i + 1] = H.charCodeAt(x & 15);
  });
  out[out.length - 1] = 0x3e;
  return out;
}

const COMPS: Record<string, 1 | 3> = {
  G: 1,
  DeviceGray: 1,
  RGB: 3,
  DeviceRGB: 3,
};

/**
 * Paints the covered pixels of an inline image (8-bit gray or RGB, raw or
 * Flate without predictor) and returns the replacement op.
 */
export function patchInline(
  op: ContentOp,
  ctm: Matrix,
  marks: readonly Box[],
  fill: Rgb | readonly Rgb[],
): { op: ContentOp } | { raster: RasterReason } {
  const inline = op.inline;
  if (!inline) return { raster: 'parse-error' };
  const d = inline.dict;
  const w = pick(d, 'W', 'Width');
  const h = pick(d, 'H', 'Height');
  const bpc = pick(d, 'BPC', 'BitsPerComponent');
  const cs = pick(d, 'CS', 'ColorSpace');
  const mask = pick(d, 'IM', 'ImageMask');
  if (mask?.t === 'bool' && mask.v) return { raster: 'image-colorspace' };
  if (w?.t !== 'num' || h?.t !== 'num' || bpc?.t !== 'num' || bpc.v !== 8)
    return { raster: 'image-colorspace' };
  const comps = cs?.t === 'name' ? COMPS[cs.v] : undefined;
  if (!comps) return { raster: 'image-colorspace' };
  if (pick(d, 'D', 'Decode') || pick(d, 'DP', 'DecodeParms'))
    return { raster: 'image-filter' };
  const f = pick(d, 'F', 'Filter');
  const names =
    f === undefined
      ? []
      : f.t === 'name'
        ? [f.v]
        : f.t === 'arr'
          ? f.v.map((x) => (x.t === 'name' ? x.v : '?'))
          : ['?'];
  const chain = names.map((n) => FILTERS[n] ?? '?').join(' ');
  let pixels: Uint8Array | null;
  if (chain === '') pixels = inline.data.slice();
  else if (chain === 'Fl') pixels = inflate(inline.data, null, comps, w.v);
  else if (chain === 'AHx') pixels = fromHex(inline.data);
  else if (chain === 'AHx Fl') {
    const raw = fromHex(inline.data);
    pixels = raw && inflate(raw, null, comps, w.v);
  } else return { raster: 'image-filter' };
  const size = w.v * h.v * comps;
  if (!pixels || pixels.length < size) return { raster: 'image-filter' };
  const img = { width: w.v, height: h.v, comps, pixels: pixels.slice(0, size) };
  paintCovered(img, ctm, marks, fill);
  // ASCIIHex outside Flate: the data then ends at '>' and can never hold an "EI".
  const data = toHex(zlibSync(img.pixels));
  const num = (v: number): Tok => ({ t: 'num', v, raw: '' });
  const name = (v: string): Tok => ({ t: 'name', v });
  return {
    op: {
      op: 'BI',
      operands: [],
      inline: {
        dict: new Map<string, Tok>([
          ['W', num(w.v)],
          ['H', num(h.v)],
          ['CS', name(comps === 1 ? 'G' : 'RGB')],
          ['BPC', num(8)],
          ['F', { t: 'arr', v: [name('AHx'), name('Fl')] }],
          ['L', num(data.length)],
        ]),
        data,
      },
    },
  };
}
