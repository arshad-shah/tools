import { Font, type IFontNames } from '@pdf-lib/standard-fonts';
import {
  decodePDFRawStream,
  PDFArray,
  PDFName,
  PDFNumber,
  PDFRawStream,
  type PDFDict,
  type PDFDocument,
} from 'pdf-lib';
import {
  cidFor,
  codeLengthIn,
  isVertical,
  parseCidMappings,
  parseCodespaceRanges,
} from './cmap';
import {
  baseEncoding,
  dingbatsTable,
  standardTable,
  symbolTable,
} from './encodings';
import {
  arrayOf,
  dictOf,
  get,
  nameOf,
  numberOf,
  numbers,
  resolve,
} from './pdf-obj';

/** Why a page cannot be redacted in place and is turned into an image instead. */
export type RasterReason =
  | 'type3-no-metrics'
  | 'font-no-widths'
  | 'unsupported-cmap'
  | 'clip-text'
  | 'pattern-text'
  | 'pattern-content'
  | 'image-filter'
  | 'image-colorspace'
  | 'parse-error';

export interface FontMetrics {
  kind: 'simple' | 'cid' | 'type3';
  /** 1 for simple fonts; per codespace ranges for CID fonts (Identity-H = 2). */
  codeLength(bytes: Uint8Array, at: number): number;
  /** Glyph space units / 1000 (Type 3: already multiplied by FontMatrix[0]). */
  width(code: number): number;
  /** Text space units per 1 unit of font size (e.g. 0.8 and -0.2). */
  ascent: number;
  descent: number;
  /** Tw applies to the single-byte code 32 only (PDF 9.3.3). */
  isSpace(code: number, length: number): boolean;
}

const STANDARD_14 = new Set([
  'Courier',
  'Courier-Bold',
  'Courier-Oblique',
  'Courier-BoldOblique',
  'Helvetica',
  'Helvetica-Bold',
  'Helvetica-Oblique',
  'Helvetica-BoldOblique',
  'Times-Roman',
  'Times-Bold',
  'Times-Italic',
  'Times-BoldItalic',
  'Symbol',
  'ZapfDingbats',
]);

/** Common aliases viewers map onto the standard 14 (subset prefix removed). */
function standardName(base: string | undefined): IFontNames | null {
  if (!base) return null;
  const n = base.replace(/^[A-Z]{6}\+/, '');
  if (STANDARD_14.has(n)) return n as IFontNames;
  const m =
    /^(Arial|ArialMT|Helvetica|TimesNewRoman(?:PS)?(?:MT)?|Times|CourierNew(?:PS)?(?:MT)?|Courier)(?:[,-](Bold|Italic|BoldItalic|Oblique|BoldOblique)(?:MT)?)?$/.exec(
      n,
    );
  if (!m) return null;
  const style = m[2] ?? '';
  const bold = style.startsWith('Bold');
  const italic = /Italic|Oblique/.test(style);
  if (/^Times/.test(m[1]))
    return (
      bold && italic
        ? 'Times-BoldItalic'
        : bold
          ? 'Times-Bold'
          : italic
            ? 'Times-Italic'
            : 'Times-Roman'
    ) as IFontNames;
  const family = /^Courier/.test(m[1]) ? 'Courier' : 'Helvetica';
  const suffix =
    bold && italic ? '-BoldOblique' : bold ? '-Bold' : italic ? '-Oblique' : '';
  return `${family}${suffix}` as IFontNames;
}

const sane = (a: number, d: number) =>
  Number.isFinite(a) && Number.isFinite(d) && a > d;

/** Ascent and descent per unit of font size, from the descriptor or bbox. */
function verticalExtent(
  doc: PDFDocument,
  descriptor: PDFDict | undefined,
  fallback: [number, number] = [0.8, -0.2],
): [number, number] {
  const a = numberOf(doc, descriptor, 'Ascent');
  const d = numberOf(doc, descriptor, 'Descent');
  if (a !== undefined && d !== undefined && sane(a, d) && a !== 0)
    return [a / 1000, d / 1000];
  const bbox = numbers(doc, arrayOf(doc, descriptor, 'FontBBox'));
  if (bbox.length === 4 && sane(bbox[3], bbox[1]))
    return [bbox[3] / 1000, bbox[1] / 1000];
  return fallback;
}

const single = {
  codeLength: () => 1,
  isSpace: (code: number, length: number) => length === 1 && code === 32,
};

/** Code to glyph name through /Encoding (base encoding plus /Differences). */
function glyphNames(
  doc: PDFDocument,
  font: PDFDict,
  std: IFontNames,
): ReadonlyMap<number, string> {
  const builtIn =
    std === 'Symbol'
      ? symbolTable()
      : std === 'ZapfDingbats'
        ? dingbatsTable()
        : standardTable();
  const enc = get(doc, font, 'Encoding');
  if (enc instanceof PDFName) return baseEncoding(enc.decodeText()) ?? builtIn;
  const encDict = dictOf(doc, font, 'Encoding');
  if (!encDict) return builtIn;
  const out = new Map(
    baseEncoding(nameOf(doc, encDict, 'BaseEncoding')) ?? builtIn,
  );
  const diffs = arrayOf(doc, encDict, 'Differences');
  let code = 0;
  for (const item of diffs?.asArray() ?? []) {
    const v = resolve(doc, item);
    if (v instanceof PDFNumber) code = v.asNumber();
    else if (v instanceof PDFName) out.set(code++, v.decodeText());
  }
  return out;
}

function simpleMetrics(
  doc: PDFDocument,
  font: PDFDict,
): FontMetrics | { raster: 'font-no-widths' } {
  const descriptor = dictOf(doc, font, 'FontDescriptor');
  const widths = numbers(doc, arrayOf(doc, font, 'Widths'));
  const first = numberOf(doc, font, 'FirstChar') ?? 0;
  const missing = numberOf(doc, descriptor, 'MissingWidth') ?? 0;
  const std = standardName(nameOf(doc, font, 'BaseFont'));
  if (widths.length > 0) {
    const [ascent, descent] = verticalExtent(doc, descriptor);
    return {
      kind: 'simple',
      ...single,
      ascent,
      descent,
      width(code) {
        const w = widths[code - first];
        return (w !== undefined && Number.isFinite(w) ? w : missing) / 1000;
      },
    };
  }
  if (!std) return { raster: 'font-no-widths' };
  const afm = Font.load(std);
  const names = glyphNames(doc, font, std);
  const fallback: [number, number] = sane(afm.FontBBox[3], afm.FontBBox[1])
    ? [
        (afm.Ascender ?? afm.FontBBox[3]) / 1000,
        (afm.Descender ?? afm.FontBBox[1]) / 1000,
      ]
    : [0.8, -0.2];
  const [ascent, descent] = descriptor
    ? verticalExtent(doc, descriptor, fallback)
    : fallback;
  return {
    kind: 'simple',
    ...single,
    ascent,
    descent,
    width(code) {
      const glyph = names.get(code);
      const w = glyph ? afm.getWidthOfGlyph(glyph) : undefined;
      return (typeof w === 'number' ? w : missing) / 1000;
    },
  };
}

function type3Metrics(
  doc: PDFDocument,
  font: PDFDict,
): FontMetrics | { raster: 'type3-no-metrics' } {
  const matrix = numbers(doc, arrayOf(doc, font, 'FontMatrix'));
  const widths = numbers(doc, arrayOf(doc, font, 'Widths'));
  const bbox = numbers(doc, arrayOf(doc, font, 'FontBBox'));
  const first = numberOf(doc, font, 'FirstChar') ?? 0;
  if (
    matrix.length !== 6 ||
    !matrix.every(Number.isFinite) ||
    widths.length === 0 ||
    matrix[1] !== 0 ||
    matrix[2] !== 0 ||
    bbox.length !== 4 ||
    !sane(bbox[3], bbox[1])
  )
    return { raster: 'type3-no-metrics' };
  const [sx, , , sy, , ty] = matrix;
  return {
    kind: 'type3',
    ...single,
    // Glyph space to text space through FontMatrix (§9.6.5).
    ascent: bbox[3] * sy + ty,
    descent: bbox[1] * sy + ty,
    width(code) {
      const w = widths[code - first];
      return (w !== undefined && Number.isFinite(w) ? w : 0) * sx;
    },
  };
}

/** /W entries: `c [w1 w2 ...]` and `cfirst clast w` (§9.7.4.3). */
function cidWidths(doc: PDFDocument, w: PDFArray | undefined) {
  const map = new Map<number, number>();
  const items = w?.asArray().map((x) => resolve(doc, x)) ?? [];
  for (let i = 0; i < items.length; ) {
    const a = items[i];
    const b = items[i + 1];
    if (!(a instanceof PDFNumber)) break;
    if (b instanceof PDFArray) {
      numbers(doc, b).forEach((v, k) => map.set(a.asNumber() + k, v));
      i += 2;
    } else if (b instanceof PDFNumber) {
      const c = items[i + 2];
      if (!(c instanceof PDFNumber)) break;
      for (let cid = a.asNumber(); cid <= b.asNumber(); cid++)
        map.set(cid, c.asNumber());
      i += 3;
    } else break;
  }
  return map;
}

function cidMetrics(
  doc: PDFDocument,
  font: PDFDict,
): FontMetrics | { raster: 'unsupported-cmap' | 'font-no-widths' } {
  const descendants = arrayOf(doc, font, 'DescendantFonts');
  const cidFont = descendants
    ? (resolve(doc, descendants.get(0)) as PDFDict | undefined)
    : undefined;
  if (!cidFont || !('get' in cidFont)) return { raster: 'font-no-widths' };
  const widths = cidWidths(doc, arrayOf(doc, cidFont, 'W'));
  const dw = numberOf(doc, cidFont, 'DW') ?? 1000;
  const [ascent, descent] = verticalExtent(
    doc,
    dictOf(doc, cidFont, 'FontDescriptor'),
  );
  const base = { kind: 'cid' as const, ascent, descent };
  const widthOf = (cid: number) => (widths.get(cid) ?? dw) / 1000;
  const isSpace = () => false;
  const enc = get(doc, font, 'Encoding');
  if (enc instanceof PDFName) {
    // Vertical writing moves glyphs downwards (§9.7.4.3): not positioned here.
    if (enc.decodeText() !== 'Identity-H')
      return { raster: 'unsupported-cmap' };
    return {
      ...base,
      isSpace,
      codeLength: (bytes, at) => Math.min(2, Math.max(1, bytes.length - at)),
      width: widthOf,
    };
  }
  if (!(enc instanceof PDFRawStream)) return { raster: 'unsupported-cmap' };
  if (enc.dict.get(PDFName.of('UseCMap')))
    return { raster: 'unsupported-cmap' };
  const cmap = decodePDFRawStream(enc).decode();
  const ranges = parseCodespaceRanges(cmap);
  if (!ranges.length || isVertical(cmap)) return { raster: 'unsupported-cmap' };
  const cids = parseCidMappings(cmap);
  let lastLength = 1;
  return {
    ...base,
    isSpace,
    codeLength(bytes, at) {
      lastLength = codeLengthIn(ranges, bytes, at);
      return lastLength;
    },
    width: (code) => widthOf(cidFor(cids, code, lastLength)),
  };
}

export function loadFontMetrics(
  doc: PDFDocument,
  fontDict: PDFDict,
): FontMetrics | { raster: RasterReason } {
  const subtype = nameOf(doc, fontDict, 'Subtype');
  if (subtype === 'Type3') return type3Metrics(doc, fontDict);
  if (subtype === 'Type0') return cidMetrics(doc, fontDict);
  return simpleMetrics(doc, fontDict);
}
