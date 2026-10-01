import {
  decodePDFRawStream,
  PDFArray,
  PDFBool,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFStream,
  type PDFDocument,
  type PDFObject,
  type PDFPage,
} from 'pdf-lib';
import { contentOps } from './content-ops';

export type Matrix = [number, number, number, number, number, number];
export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** m then n (PDF row-vector convention: CTM' = m × CTM). */
export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

const nameOf = (o: PDFObject | undefined) =>
  o instanceof PDFName ? o.decodeText() : null;
const num = (d: PDFDict, key: string, fallback: number) => {
  const v = d.lookup(PDFName.of(key));
  return v instanceof PDFNumber ? v.asNumber() : fallback;
};

/** The stream's decoded bytes, or null when a filter is unsupported or broken. */
export function decodeStream(stream: PDFRawStream): Uint8Array | null {
  try {
    return decodePDFRawStream(stream).decode();
  } catch {
    return null;
  }
}

export function filtersOf(dict: PDFDict): string[] {
  const f = dict.lookup(PDFName.of('Filter'));
  if (f instanceof PDFName) return [f.decodeText()];
  if (f instanceof PDFArray)
    return Array.from(
      { length: f.size() },
      (_, k) => nameOf(f.lookup(k)) ?? '?',
    );
  return [];
}

export function predictorOf(dict: PDFDict): number {
  let p = dict.lookup(PDFName.of('DecodeParms'));
  if (p instanceof PDFArray) p = p.lookup(0);
  return p instanceof PDFDict ? num(p, 'Predictor', 1) : 1;
}

function matrixOf(dict: PDFDict): Matrix {
  const m = dict.lookup(PDFName.of('Matrix'));
  if (m instanceof PDFArray && m.size() === 6) {
    const v = m
      .asArray()
      .map((x) => (x instanceof PDFNumber ? x.asNumber() : Number.NaN));
    if (v.every(Number.isFinite)) return v as Matrix;
  }
  return IDENTITY;
}

function pageContent(doc: PDFDocument, page: PDFPage): Uint8Array | null {
  const contents = page.node.Contents();
  if (!contents) return null;
  const streams =
    contents instanceof PDFArray
      ? contents.asArray().map((r) => doc.context.lookup(r))
      : [contents];
  const parts: Uint8Array[] = [];
  for (const s of streams) {
    if (!(s instanceof PDFRawStream)) return null;
    const d = decodeStream(s);
    if (!d) return null;
    parts.push(d, Uint8Array.of(0x0a));
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const MAX_FORM_DEPTH = 8;

/**
 * The lowest effective DPI each image XObject is drawn at, over every
 * placement (pages and nested form XObjects), keyed by `ref.toString()`.
 * Images that are never drawn (or only through content we cannot decode)
 * are absent.
 */
export function placementDpi(doc: PDFDocument): Map<string, number> {
  const best = new Map<string, number>();
  const record = (ref: PDFRef, ctm: Matrix, w: number, h: number) => {
    const wPt = Math.hypot(ctm[0], ctm[1]);
    const hPt = Math.hypot(ctm[2], ctm[3]);
    if (wPt < 1e-6 || hPt < 1e-6) return;
    const dpi = Math.min(w / (wPt / 72), h / (hPt / 72));
    const key = ref.toString();
    const prev = best.get(key);
    if (prev === undefined || dpi < prev) best.set(key, dpi);
  };
  const walk = (
    content: Uint8Array,
    resources: PDFDict | undefined,
    start: Matrix,
    depth: number,
    seen: ReadonlySet<string>,
  ) => {
    const xo = resources?.lookup(PDFName.of('XObject'));
    const xobjects = xo instanceof PDFDict ? xo : undefined;
    const stack: Matrix[] = [];
    let ctm = start;
    for (const { op, operands } of contentOps(content)) {
      if (op === 'q') stack.push(ctm);
      else if (op === 'Q') ctm = stack.pop() ?? start;
      else if (op === 'cm') {
        const m = operands.slice(-6);
        if (m.length === 6 && m.every((v) => typeof v === 'number'))
          ctm = multiply(m as Matrix, ctm);
      } else if (op === 'Do' && xobjects) {
        const name = operands[operands.length - 1];
        if (typeof name !== 'string') continue;
        const ref = xobjects.get(PDFName.of(name));
        if (!(ref instanceof PDFRef)) continue;
        const stream = doc.context.lookup(ref);
        if (!(stream instanceof PDFRawStream)) continue;
        const subtype = nameOf(stream.dict.lookup(PDFName.of('Subtype')));
        if (subtype === 'Image')
          record(
            ref,
            ctm,
            num(stream.dict, 'Width', 0),
            num(stream.dict, 'Height', 0),
          );
        else if (
          subtype === 'Form' &&
          depth < MAX_FORM_DEPTH &&
          !seen.has(ref.toString())
        ) {
          const inner = decodeStream(stream);
          const res = stream.dict.lookup(PDFName.of('Resources'));
          if (inner)
            walk(
              inner,
              res instanceof PDFDict ? res : resources,
              multiply(matrixOf(stream.dict), ctm),
              depth + 1,
              new Set([...seen, ref.toString()]),
            );
        }
      }
    }
  };
  for (const page of doc.getPages()) {
    const content = pageContent(doc, page);
    if (content) walk(content, page.node.Resources(), IDENTITY, 0, new Set());
  }
  return best;
}

export interface ClassifyInput {
  filters: string[];
  colorSpace: string;
  bitsPerComponent: number;
  imageMask: boolean;
  hasDecode: boolean;
  colorKeyMask: boolean;
  predictor: number;
  smask: 'none' | 'ok' | 'unsupported' | 'shared';
}

const FILTER_REASON: Record<string, string> = {
  JBIG2Decode: 'JBIG2',
  JPXDecode: 'JPEG 2000',
  CCITTFaxDecode: 'CCITT fax',
};
const OK_SPACES = new Set([
  'DeviceRGB',
  'DeviceGray',
  'ICCBased(1)',
  'ICCBased(3)',
]);

/** Why an image must be left untouched, or null when it can be recompressed. */
export function classifyImage(i: ClassifyInput): string | null {
  if (i.imageMask) return 'image mask';
  for (const f of i.filters) if (FILTER_REASON[f]) return FILTER_REASON[f];
  if (i.filters.length > 1) return 'multiple filters';
  const f = i.filters[0] ?? null;
  if (f !== null && f !== 'DCTDecode' && f !== 'FlateDecode')
    return `${f} filter`;
  if (i.colorSpace === 'DeviceCMYK' || i.colorSpace === 'ICCBased(4)')
    return 'CMYK colour';
  if (i.colorSpace === 'DeviceN' || i.colorSpace === 'Separation')
    return 'DeviceN/Separation colour';
  if (i.colorSpace === 'Indexed') return 'Indexed colour';
  if (i.bitsPerComponent === 1) return '1-bit';
  if (i.bitsPerComponent === 16) return '16-bit';
  if (i.bitsPerComponent !== 8) return `${i.bitsPerComponent}-bit`;
  if (!OK_SPACES.has(i.colorSpace)) return `${i.colorSpace} colour`;
  if (i.hasDecode) return 'custom decode array';
  if (i.colorKeyMask) return 'colour-key mask';
  if (f === 'FlateDecode' && i.predictor > 1 && i.predictor < 10)
    return 'TIFF predictor';
  if (i.smask === 'unsupported') return 'unsupported soft mask';
  if (i.smask === 'shared') return 'shared soft mask';
  return null;
}

function colorSpaceOf(
  doc: PDFDocument,
  dict: PDFDict,
): { label: string; components: number | null } {
  const raw = dict.get(PDFName.of('ColorSpace'));
  const cs = raw instanceof PDFRef ? doc.context.lookup(raw) : raw;
  const name = nameOf(cs);
  if (name)
    return {
      label: name,
      components:
        name === 'DeviceRGB'
          ? 3
          : name === 'DeviceGray'
            ? 1
            : name === 'DeviceCMYK'
              ? 4
              : null,
    };
  if (cs instanceof PDFArray) {
    const family = nameOf(cs.lookup(0));
    if (family === 'ICCBased') {
      const s = cs.lookup(1);
      const n =
        s instanceof PDFStream ? s.dict.lookup(PDFName.of('N')) : undefined;
      const count = n instanceof PDFNumber ? n.asNumber() : null;
      return { label: `ICCBased(${count ?? '?'})`, components: count };
    }
    return { label: family ?? 'unknown', components: null };
  }
  return { label: 'unknown', components: null };
}

export interface ImageEntry {
  ref: PDFRef;
  key: string;
  width: number;
  height: number;
  bitsPerComponent: number;
  filter: string | null;
  colorSpace: string;
  components: number | null;
  smask: PDFRef | null;
  encodedBytes: number;
  effectiveDpi: number | null;
  eligible: boolean;
  reason: string | null;
}

/**
 * Every image XObject in the file with its placement DPI and whether it may
 * be recompressed. Images that serve only as another image's SMask are not
 * listed; they travel with their parent.
 */
export function inventoryImages(doc: PDFDocument): ImageEntry[] {
  const dpi = placementDpi(doc);
  const images: [PDFRef, PDFRawStream][] = [];
  const smaskUse = new Map<string, number>();
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (
      !(obj instanceof PDFRawStream) ||
      nameOf(obj.dict.lookup(PDFName.of('Subtype'))) !== 'Image'
    )
      continue;
    images.push([ref, obj]);
    const sm = obj.dict.get(PDFName.of('SMask'));
    if (sm instanceof PDFRef)
      smaskUse.set(sm.toString(), (smaskUse.get(sm.toString()) ?? 0) + 1);
  }
  const smaskStatus = (ref: PDFRef | null): ClassifyInput['smask'] => {
    if (!ref) return 'none';
    if ((smaskUse.get(ref.toString()) ?? 0) > 1) return 'shared';
    const s = doc.context.lookup(ref);
    if (!(s instanceof PDFRawStream)) return 'unsupported';
    const f = filtersOf(s.dict);
    const p = predictorOf(s.dict);
    const okFilter =
      f.length === 0 ||
      (f.length === 1 && (f[0] === 'FlateDecode' || f[0] === 'DCTDecode'));
    // /Matte (pre-multiplied colour) and /Decode change what the samples
    // mean; resampling those masks independently would be wrong.
    return okFilter &&
      num(s.dict, 'BitsPerComponent', 8) === 8 &&
      !s.dict.has(PDFName.of('Decode')) &&
      !s.dict.has(PDFName.of('Matte')) &&
      !(p > 1 && p < 10)
      ? 'ok'
      : 'unsupported';
  };
  return images
    .filter(([ref]) => !smaskUse.has(ref.toString()))
    .map(([ref, s]) => {
      const d = s.dict;
      const filters = filtersOf(d);
      const cs = colorSpaceOf(doc, d);
      const smRaw = d.get(PDFName.of('SMask'));
      const smask = smRaw instanceof PDFRef ? smRaw : null;
      const mask = d.lookup(PDFName.of('Mask'));
      const imageMask = d.lookup(PDFName.of('ImageMask'));
      const reason = classifyImage({
        filters,
        colorSpace: cs.label,
        bitsPerComponent: num(d, 'BitsPerComponent', 8),
        imageMask: imageMask instanceof PDFBool && imageMask.asBoolean(),
        hasDecode: d.has(PDFName.of('Decode')),
        colorKeyMask: mask instanceof PDFArray,
        predictor: predictorOf(d),
        smask: smaskStatus(smask),
      });
      return {
        ref,
        key: ref.toString(),
        width: num(d, 'Width', 0),
        height: num(d, 'Height', 0),
        bitsPerComponent: num(d, 'BitsPerComponent', 8),
        filter: filters[0] ?? null,
        colorSpace: cs.label,
        components: cs.components,
        smask,
        encodedBytes: s.contents.length,
        effectiveDpi: dpi.get(ref.toString()) ?? null,
        eligible: reason === null,
        reason,
      };
    });
}
