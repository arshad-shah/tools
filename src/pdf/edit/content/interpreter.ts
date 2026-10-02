import { PDFArray, PDFName, type PDFDict, type PDFDocument } from 'pdf-lib';
import type { Box } from '@/pdf/doc/types';
import {
  loadFontMetrics,
  type FontMetrics,
  type RasterReason,
} from './font-metrics';
import {
  apply,
  corners,
  quadBox,
  IDENTITY,
  mul,
  type Matrix,
  type Quad,
} from './matrix';
import { arrayOf, dictOf, get, nameOf, numbers, resolve } from './pdf-obj';
import type { ParsedContent, Tok } from './tokens';

export { apply, corners, invert, mul, quadBox, IDENTITY } from './matrix';
export type { Matrix, Point, Quad } from './matrix';

export interface GlyphHit {
  /** Index of the text-showing op. */
  op: number;
  /** Index of the string in a TJ array; 0 for Tj, ' and ". */
  part: number;
  /** Byte offset of the glyph's code within that string. */
  byteStart: number;
  byteLength: number;
  code: number;
  quad: Quad;
  /** Horizontal displacement in text space units, already x Tfs x Th. */
  advance: number;
}

export interface ImageHit {
  op: number;
  name: string | null;
  inline: boolean;
  /** Unit square to page. */
  ctm: Matrix;
}

export interface PathHit {
  opStart: number;
  opEnd: number;
  bbox: Box;
  painted: boolean;
  clip: boolean;
  /** Filled or stroked with a pattern colour (its cells can draw anything). */
  pattern: boolean;
}

export interface FormHit {
  op: number;
  name: string;
  ctm: Matrix;
}

/** Text state of one text-showing op, for rewriting it. */
export interface ShowState {
  font: string;
  tfs: number;
  th: number;
}

export interface Interpretation {
  glyphs: GlyphHit[];
  images: ImageHit[];
  paths: PathHit[];
  forms: FormHit[];
  /** Page areas of soft-mask groups set through ExtGState /SMask. */
  masks: Box[];
  raster: RasterReason[];
  shows: Map<number, ShowState>;
  fonts: Map<string, FontMetrics>;
}

interface GState {
  ctm: Matrix;
  tc: number;
  tw: number;
  th: number;
  tl: number;
  font: string | null;
  tfs: number;
  tr: number;
  rise: number;
  fillPattern: boolean;
  strokePattern: boolean;
}

const numAt = (ops: Tok[], i: number) => {
  const t = ops[i];
  return t?.t === 'num' ? t.v : NaN;
};

const nums = (ops: Tok[], n: number): number[] | null => {
  if (ops.length < n) return null;
  const out = ops.slice(ops.length - n).map((t) => (t.t === 'num' ? t.v : NaN));
  return out.every(Number.isFinite) ? out : null;
};

const SHOW = new Set(['Tj', 'TJ', "'", '"']);
const FILLS = new Set(['f', 'F', 'f*', 'B', 'B*', 'b', 'b*']);
const STROKES = new Set(['S', 's', 'B', 'B*', 'b', 'b*']);
const PAINT = new Set(['S', 's', 'f', 'F', 'f*', 'B', 'B*', 'b', 'b*', 'n']);
const CONSTRUCT = new Set(['m', 'l', 'c', 'v', 'y', 're', 'h']);

/** Font metrics per font dictionary, shared across content streams of one document. */
export type FontCache = WeakMap<
  PDFDict,
  FontMetrics | { raster: RasterReason }
>;

export function interpret(
  parsed: ParsedContent,
  resources: PDFDict | undefined,
  doc: PDFDocument,
  ctm0: Matrix,
  cache: FontCache = new WeakMap(),
): Interpretation {
  const out: Interpretation = {
    glyphs: [],
    images: [],
    paths: [],
    forms: [],
    masks: [],
    raster: [],
    shows: new Map(),
    fonts: new Map(),
  };
  const raster = (r: RasterReason) => {
    if (!out.raster.includes(r)) out.raster.push(r);
  };
  const fontsDict = dictOf(doc, resources, 'Font');
  const xobjects = dictOf(doc, resources, 'XObject');
  const colorSpaces = dictOf(doc, resources, 'ColorSpace');

  const metricsFor = (name: string): FontMetrics | null => {
    const known = out.fonts.get(name);
    if (known) return known;
    const dict = dictOf(doc, fontsDict, name);
    if (!dict) {
      raster('parse-error');
      return null;
    }
    let m = cache.get(dict);
    if (!m) {
      m = loadFontMetrics(doc, dict);
      cache.set(dict, m);
    }
    if ('raster' in m) {
      raster(m.raster);
      return null;
    }
    out.fonts.set(name, m);
    return m;
  };

  const isPatternSpace = (name: string) => {
    if (name === 'Pattern') return true;
    const cs = get(doc, colorSpaces, name);
    if (cs instanceof PDFName) return cs.decodeText() === 'Pattern';
    if (cs instanceof PDFArray) {
      const first = resolve(doc, cs.get(0));
      return first instanceof PDFName && first.decodeText() === 'Pattern';
    }
    return false;
  };

  let gs: GState = {
    ctm: ctm0,
    tc: 0,
    tw: 0,
    th: 1,
    tl: 0,
    font: null,
    tfs: 0,
    tr: 0,
    rise: 0,
    fillPattern: false,
    strokePattern: false,
  };
  const stack: GState[] = [];
  let tm: Matrix = IDENTITY;
  let tlm: Matrix = IDENTITY;
  let path: { start: number; pts: [number, number][]; clip: boolean } | null =
    null;

  const td = (tx: number, ty: number) => {
    tlm = mul([1, 0, 0, 1, tx, ty], tlm);
    tm = tlm;
  };

  const show = (opIndex: number, str: Tok, part: number, m: FontMetrics) => {
    if (str.t !== 'str') {
      raster('parse-error');
      return;
    }
    const bytes = str.v;
    for (let at = 0; at < bytes.length; ) {
      const len = m.codeLength(bytes, at);
      let code = 0;
      for (let k = 0; k < len; k++) code = code * 256 + bytes[at + k];
      const w0 = m.width(code);
      const tx =
        (w0 * gs.tfs + gs.tc + (m.isSpace(code, len) ? gs.tw : 0)) * gs.th;
      const trm = mul(
        mul([gs.tfs * gs.th, 0, 0, gs.tfs, 0, gs.rise], tm),
        gs.ctm,
      );
      out.glyphs.push({
        op: opIndex,
        part,
        byteStart: at,
        byteLength: len,
        code,
        quad: corners(trm, 0, m.descent, w0, m.ascent),
        advance: tx,
      });
      tm = mul([1, 0, 0, 1, tx, 0], tm);
      at += len;
    }
  };

  parsed.ops.forEach((op, i) => {
    const o = op.operands;
    if (CONSTRUCT.has(op.op)) {
      path ??= { start: i, pts: [], clip: false };
      const coords =
        op.op === 're' ? nums(o, 4) : op.op === 'h' ? [] : nums(o, o.length);
      if (!coords) {
        raster('parse-error');
        return;
      }
      if (op.op === 're') {
        const [x, y, w, h] = coords;
        for (const [px, py] of [
          [x, y],
          [x + w, y],
          [x, y + h],
          [x + w, y + h],
        ])
          path.pts.push(apply(gs.ctm, px, py));
      } else
        for (let k = 0; k + 1 < coords.length; k += 2)
          path.pts.push(apply(gs.ctm, coords[k], coords[k + 1]));
      return;
    }
    if (op.op === 'W' || op.op === 'W*') {
      if (path) path.clip = true;
      return;
    }
    if (PAINT.has(op.op)) {
      if (path && path.pts.length) {
        const xs = path.pts.map((p) => p[0]);
        const ys = path.pts.map((p) => p[1]);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        out.paths.push({
          opStart: path.start,
          opEnd: i,
          bbox: {
            x,
            y,
            width: Math.max(...xs) - x,
            height: Math.max(...ys) - y,
          },
          painted: op.op !== 'n',
          clip: path.clip,
          pattern:
            (FILLS.has(op.op) && gs.fillPattern) ||
            (STROKES.has(op.op) && gs.strokePattern),
        });
      }
      path = null;
      return;
    }
    switch (op.op) {
      case 'q':
        stack.push({ ...gs });
        return;
      case 'Q':
        gs = stack.pop() ?? gs;
        return;
      case 'cm': {
        const m = nums(o, 6);
        if (!m) return raster('parse-error');
        gs.ctm = mul(m as Matrix, gs.ctm);
        return;
      }
      case 'BT':
        tm = tlm = IDENTITY;
        return;
      case 'ET':
        return;
      case 'Tf': {
        const n = o[0];
        if (n?.t !== 'name') return raster('parse-error');
        gs.font = n.v;
        gs.tfs = numAt(o, 1);
        if (!Number.isFinite(gs.tfs)) raster('parse-error');
        return;
      }
      case 'Tc':
        gs.tc = numAt(o, 0);
        return;
      case 'Tw':
        gs.tw = numAt(o, 0);
        return;
      case 'Tz':
        gs.th = numAt(o, 0) / 100;
        return;
      case 'TL':
        gs.tl = numAt(o, 0);
        return;
      case 'Ts':
        gs.rise = numAt(o, 0);
        return;
      case 'Tr':
        gs.tr = numAt(o, 0);
        return;
      case 'Td':
      case 'TD': {
        const m = nums(o, 2);
        if (!m) return raster('parse-error');
        if (op.op === 'TD') gs.tl = -m[1];
        td(m[0], m[1]);
        return;
      }
      case 'Tm': {
        const m = nums(o, 6);
        if (!m) return raster('parse-error');
        tm = tlm = m as Matrix;
        return;
      }
      case 'T*':
        td(0, -gs.tl);
        return;
      case 'gs': {
        const n = o[0];
        const ext =
          n?.t === 'name'
            ? dictOf(doc, dictOf(doc, resources, 'ExtGState'), n.v)
            : undefined;
        // A font set through the graphics state is not followed here.
        if (ext?.get(PDFName.of('Font'))) raster('parse-error');
        const mask = dictOf(doc, ext, 'SMask');
        if (mask) {
          const g = dictOf(doc, mask, 'G');
          const bbox = numbers(doc, arrayOf(doc, g, 'BBox'));
          const m = numbers(doc, arrayOf(doc, g, 'Matrix'));
          const fm = (
            m.length === 6 && m.every(Number.isFinite) ? m : IDENTITY
          ) as Matrix;
          out.masks.push(
            bbox.length === 4 && bbox.every(Number.isFinite)
              ? quadBox(
                  corners(mul(fm, gs.ctm), bbox[0], bbox[1], bbox[2], bbox[3]),
                )
              : { x: -1e9, y: -1e9, width: 2e9, height: 2e9 },
          );
        }
        return;
      }
      case 'cs':
      case 'CS': {
        const n = o[0];
        const pattern = n?.t === 'name' && isPatternSpace(n.v);
        if (op.op === 'cs') gs.fillPattern = pattern;
        else gs.strokePattern = pattern;
        return;
      }
      case 'scn':
      case 'SCN': {
        const named = o[o.length - 1]?.t === 'name';
        if (op.op === 'scn') gs.fillPattern = named;
        else gs.strokePattern = named;
        return;
      }
      case 'g':
      case 'rg':
      case 'k':
        gs.fillPattern = false;
        return;
      case 'G':
      case 'RG':
      case 'K':
        gs.strokePattern = false;
        return;
      case 'Do': {
        const n = o[0];
        if (n?.t !== 'name') return raster('parse-error');
        const x = dictOf(doc, xobjects, n.v);
        const subtype = nameOf(doc, x, 'Subtype');
        if (subtype === 'Image')
          out.images.push({ op: i, name: n.v, inline: false, ctm: gs.ctm });
        else if (subtype === 'Form')
          out.forms.push({ op: i, name: n.v, ctm: gs.ctm });
        return;
      }
      case 'BI':
        out.images.push({ op: i, name: null, inline: true, ctm: gs.ctm });
        return;
    }
    if (!SHOW.has(op.op)) return;
    if (gs.tr >= 4 && gs.tr <= 7) raster('clip-text');
    const fills = [0, 2, 4, 6].includes(gs.tr);
    const strokes = [1, 2, 5, 6].includes(gs.tr);
    if ((fills && gs.fillPattern) || (strokes && gs.strokePattern))
      raster('pattern-text');
    const m = gs.font ? metricsFor(gs.font) : null;
    if (!gs.font) raster('parse-error');
    if (op.op === "'" || op.op === '"') {
      if (op.op === '"') {
        gs.tw = numAt(o, 0);
        gs.tc = numAt(o, 1);
      }
      td(0, -gs.tl);
    }
    if (!m || !gs.font) return;
    out.shows.set(i, { font: gs.font, tfs: gs.tfs, th: gs.th });
    if (op.op === 'TJ') {
      const arr = o[0];
      if (arr?.t !== 'arr') return raster('parse-error');
      arr.v.forEach((item, part) => {
        if (item.t === 'num')
          tm = mul([1, 0, 0, 1, (-item.v / 1000) * gs.tfs * gs.th, 0], tm);
        else show(i, item, part, m);
      });
      return;
    }
    show(i, o[o.length - 1], 0, m);
  });
  return out;
}
