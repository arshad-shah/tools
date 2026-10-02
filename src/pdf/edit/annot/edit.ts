import {
  PDFArray,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFRef,
  PDFString,
  PDFHexString,
  StandardFonts,
  type PDFDocument,
  type PDFPage,
} from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import type { Box } from '../draw';
import {
  appearanceStream,
  fmt,
  opacityResources,
  rgbOps,
  setAppearance,
} from './appearance';
import { colorArray, pdfDate, rectArray, textString } from './common';
import { freeTextAppearance, freeTextLayout } from './freetext';
import { inkContent } from './ink';
import { lineContent } from './line';
import { markupAppearance, type Quad, type TextMarkupSubtype } from './markup';
import { noteAppearance } from './note';
import { shapeContent } from './shapes';
import { EDITABLE_SUBTYPES } from './subtypes';
import { STAMP_LABELS, stampAppearance, type StampPreset } from './stamp';

export { EDITABLE_SUBTYPES };

export interface AnnotationPatch {
  rect?: Box;
  /**
   * The rect the move started from, as the viewer listed it. pdf.js reports
   * a recomputed rect for annotations without an appearance, which can
   * differ from the dict's /Rect; geometry maps from this one when given.
   */
  from?: Box;
  color?: string;
  contents?: string;
  opacity?: number;
}

/** pdf.js annotation id ("12R", or "12R3" for generation 3) to a reference. */
export function parseAnnotRef(id: string): PDFRef {
  const m = /^(\d+)R(\d*)$/.exec(id);
  if (!m)
    throw new ToolError('INVALID_INPUT', `"${id}" is not an annotation id`);
  return PDFRef.of(Number(m[1]), m[2] ? Number(m[2]) : 0);
}

const name = (n: PDFName) => n.asString().replace(/^\//, '');

function numbers(arr: PDFArray | undefined): number[] {
  if (!arr) return [];
  return arr
    .asArray()
    .map((o) => (o instanceof PDFNumber ? o.asNumber() : NaN));
}

function annotsOf(page: PDFPage): PDFArray | undefined {
  return page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
}

function isPopup(page: PDFPage, o: unknown): boolean {
  if (!(o instanceof PDFRef)) return false;
  const st = page.doc.context
    .lookupMaybe(o, PDFDict)
    ?.get(PDFName.of('Subtype'));
  return st instanceof PDFName && name(st) === 'Popup';
}

/**
 * Position of `ref` among the page's /Annots entries that are not popups,
 * or -1. pdf.js lists popups last, so this is the order its
 * getAnnotations() uses (ExistingAnnotation.index).
 */
export function annotIndex(page: PDFPage, ref: PDFRef): number {
  const list = (annotsOf(page)?.asArray() ?? []).filter(
    (o) => !isPopup(page, o),
  );
  return list.findIndex((o) => o === ref);
}

/** The reference at a position counted as annotIndex counts. */
export function annotAt(page: PDFPage, index: number): PDFRef | null {
  const list = (annotsOf(page)?.asArray() ?? []).filter(
    (o) => !isPopup(page, o),
  );
  const o = list[index];
  return o instanceof PDFRef ? o : null;
}

/** The annotation on the page whose /NM is `nm`. */
export function annotByNm(page: PDFPage, nm: string): PDFRef | null {
  const annots = annotsOf(page);
  if (!annots) return null;
  for (const o of annots.asArray()) {
    if (!(o instanceof PDFRef)) continue;
    const d = page.doc.context.lookupMaybe(o, PDFDict);
    const v = d?.lookup(PDFName.of('NM'));
    if (
      (v instanceof PDFString || v instanceof PDFHexString) &&
      v.decodeText() === nm
    )
      return o;
  }
  return null;
}

/** Removes an annotation (and its popup) from the page; false when not there. */
export function deleteAnnotation(
  doc: PDFDocument,
  page: PDFPage,
  ref: PDFRef,
): boolean {
  const annots = annotsOf(page);
  if (!annots || annotIndex(page, ref) < 0) return false;
  const dict = doc.context.lookupMaybe(ref, PDFDict);
  const popup = dict?.get(PDFName.of('Popup'));
  const drop = new Set<unknown>([ref, popup]);
  for (let i = annots.size() - 1; i >= 0; i--) {
    const o = annots.get(i);
    const d = o instanceof PDFRef ? doc.context.lookupMaybe(o, PDFDict) : null;
    if (drop.has(o) || d?.get(PDFName.of('Parent')) === ref) annots.remove(i);
  }
  return true;
}

function toHex(c: number[]): string {
  let rgb = c;
  if (c.length === 1) rgb = [c[0], c[0], c[0]];
  if (c.length === 4) rgb = [0, 1, 2].map((i) => (1 - c[i]) * (1 - c[3]));
  if (rgb.length !== 3) return '#000000';
  return `#${rgb
    .map((v) =>
      Math.round(Math.max(0, Math.min(1, v)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function boxOf(r: number[]): Box {
  return { x: r[0], y: r[1], width: r[2] - r[0], height: r[3] - r[1] };
}

/** Rewrites /Rect, /C, /CA, /Contents and /M; regenerates the appearance of supported subtypes. */
export async function updateAnnotation(
  doc: PDFDocument,
  page: PDFPage,
  ref: PDFRef,
  patch: AnnotationPatch,
  /** /M: when the edit was made (default now). */
  modified: Date = new Date(),
): Promise<boolean> {
  if (annotIndex(page, ref) < 0) return false;
  const dict = doc.context.lookupMaybe(ref, PDFDict);
  if (!dict) return false;
  const subtype = name(dict.lookup(PDFName.of('Subtype'), PDFName));
  const get = (k: string) => dict.lookupMaybe(PDFName.of(k), PDFArray);
  const [x1, y1, x2, y2] = rectArray(patch.from ?? boxOf(numbers(get('Rect'))));
  if (patch.rect) {
    const nr = rectArray(patch.rect);
    const sx = x2 > x1 ? (nr[2] - nr[0]) / (x2 - x1) : 1;
    const sy = y2 > y1 ? (nr[3] - nr[1]) / (y2 - y1) : 1;
    const mapXY = (vals: number[]) =>
      vals.map((v, i) =>
        i % 2 === 0 ? nr[0] + (v - x1) * sx : nr[1] + (v - y1) * sy,
      );
    for (const key of ['QuadPoints', 'L'])
      if (get(key))
        dict.set(PDFName.of(key), doc.context.obj(mapXY(numbers(get(key)))));
    const ink = get('InkList');
    if (ink)
      dict.set(
        PDFName.of('InkList'),
        doc.context.obj(
          ink
            .asArray()
            .map((s) => mapXY(numbers(s instanceof PDFArray ? s : undefined))),
        ),
      );
    dict.set(PDFName.of('Rect'), doc.context.obj(nr));
  }
  if (patch.color)
    dict.set(PDFName.of('C'), doc.context.obj(colorArray(patch.color)));
  if (patch.opacity !== undefined) {
    if (!(patch.opacity >= 0 && patch.opacity <= 1))
      throw new ToolError('INVALID_INPUT', 'Opacity must be between 0 and 1');
    dict.set(PDFName.of('CA'), doc.context.obj(patch.opacity));
  }
  if (patch.contents !== undefined)
    dict.set(PDFName.of('Contents'), textString(patch.contents));
  dict.set(PDFName.of('M'), PDFString.of(pdfDate(modified)));
  if (EDITABLE_SUBTYPES.has(subtype))
    await regenerate(doc, dict, subtype, patch);
  return true;
}

async function regenerate(
  doc: PDFDocument,
  dict: PDFDict,
  subtype: string,
  patch: AnnotationPatch,
): Promise<void> {
  const arr = (k: string) => numbers(dict.lookupMaybe(PDFName.of(k), PDFArray));
  const rect = boxOf(rectArray(boxOf(arr('Rect'))).slice() as number[]);
  const color = toHex(arr('C'));
  const caObj = dict.lookup(PDFName.of('CA'));
  const opacity = caObj instanceof PDFNumber ? caObj.asNumber() : 1;
  const bs = dict.lookupMaybe(PDFName.of('BS'), PDFDict);
  const bw = bs?.lookup(PDFName.of('W'));
  const width = bw instanceof PDFNumber ? bw.asNumber() : 1;
  const contentsObj = dict.lookup(PDFName.of('Contents'));
  const contents =
    contentsObj instanceof PDFString || contentsObj instanceof PDFHexString
      ? contentsObj.decodeText()
      : '';
  let content: string;
  let resources = opacityResources(opacity);
  switch (subtype) {
    case 'Highlight':
    case 'Underline':
    case 'StrikeOut':
    case 'Squiggly': {
      const q = arr('QuadPoints');
      const quads: Quad[] = [];
      for (let i = 0; i + 8 <= q.length; i += 8)
        quads.push(q.slice(i, i + 8) as Quad);
      const ap = markupAppearance({
        subtype: subtype as TextMarkupSubtype,
        quads,
        color,
        opacity,
      } as Parameters<typeof markupAppearance>[0]);
      content = ap.content;
      resources = { ExtGState: ap.extGState };
      break;
    }
    case 'Text':
      content = noteAppearance([rect.x, rect.y], color);
      break;
    case 'Ink': {
      const ink = dict.lookupMaybe(PDFName.of('InkList'), PDFArray);
      const strokes = (ink?.asArray() ?? []).map((s) => {
        const v = numbers(s instanceof PDFArray ? s : undefined);
        const pts: [number, number][] = [];
        for (let i = 0; i + 1 < v.length; i += 2) pts.push([v[i], v[i + 1]]);
        return pts;
      });
      content = inkContent(
        strokes.filter((s) => s.length),
        width,
        color,
      );
      break;
    }
    case 'Square':
    case 'Circle': {
      const ic = arr('IC');
      content = shapeContent({
        kind: subtype,
        rect,
        width,
        color,
        fill: ic.length ? toHex(ic) : null,
      });
      break;
    }
    case 'Line': {
      const l = arr('L');
      const le = dict.lookupMaybe(PDFName.of('LE'), PDFArray);
      const end = le?.lookup(1);
      content = lineContent({
        from: [l[0], l[1]],
        to: [l[2], l[3]],
        width,
        color,
        arrowEnd: end instanceof PDFName && name(end) === 'OpenArrow',
      });
      break;
    }
    case 'FreeText': {
      const font = doc.embedStandardFont(StandardFonts.Helvetica);
      const da = dict.lookup(PDFName.of('DA'));
      const m = /([\d.]+)\s+Tf/.exec(
        da instanceof PDFString ? da.asString() : '',
      );
      const q = dict.lookup(PDFName.of('Q'));
      const align =
        (['left', 'center', 'right'] as const)[
          q instanceof PDFNumber ? q.asNumber() : 0
        ] ?? 'left';
      const fitted = freeTextLayout(font, {
        rect,
        text: contents,
        fontSize: m ? Number(m[1]) : 12,
      });
      dict.set(
        PDFName.of('DA'),
        PDFString.of(`/Helv ${fmt(fitted.size)} Tf ${rgbOps(color, false)}`),
      );
      [content, resources] = freeTextAppearance(
        font,
        { rect, color, opacity, align, border: width > 0 },
        fitted.size,
        fitted.lines,
      );
      break;
    }
    case 'Stamp': {
      // Image and third-party stamps keep their art (viewers fit it to /Rect);
      // a recoloured label stamp is redrawn.
      const preset = dict.lookupMaybe(PDFName.of('Name'), PDFName);
      const presetName = preset ? (name(preset) as StampPreset) : undefined;
      const label =
        presetName && presetName in STAMP_LABELS ? undefined : contents;
      if (
        !patch.color ||
        (!label && !(presetName && presetName in STAMP_LABELS))
      )
        return;
      [content, resources] = await stampAppearance(doc, {
        rect,
        preset: label ? undefined : presetName,
        label,
        color,
        opacity,
      });
      break;
    }
    default:
      return;
  }
  setAppearance(dict, appearanceStream(doc, rect, content, resources));
}
