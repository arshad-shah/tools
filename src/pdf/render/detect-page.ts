import {
  buildCells,
  detectPage,
  extractGeometry,
  findSignTargets,
  type FontAdvances,
  isFlatForm,
  normaliseLines,
  type OperatorListLike,
  type OpsTable,
  type PageDetection,
  type PageGeometry,
  type Seg,
  type SignTarget,
} from '@/pdf/detect';
import { imageCoverage, type ImageOpsTable } from '@/pdf/detect/raster';
import type { PageTextItems } from './handlers/text';
import { textItemsFrom } from './text';

/**
 * A page's detection plus its table cells (click-anywhere snaps to them)
 * and the places to sign (smart placement, plan H-8).
 */
export interface PageDetectionResult extends PageDetection {
  cells: { x: number; y: number; width: number; height: number }[];
  signTargets: SignTarget[];
}

/** The parts of a pdf.js page detection reads (tests pass the legacy build's). */
export interface DetectPageLike {
  getOperatorList(): Promise<OperatorListLike>;
  getTextContent(o: {
    includeMarkedContent: boolean;
  }): Promise<Parameters<typeof textItemsFrom>[0]>;
  commonObjs: { has(id: string): boolean; get(id: string): unknown };
  /** pdf.js `page.view`: the unrotated crop box. */
  view?: number[];
}

/** Raster rulings are found on a render at this DPI (spec 11). */
export const RASTER_DPI = 150;
/** An image must cover more than this share of the page to be a scan. */
export const SCAN_COVERAGE = 0.5;

/** The raster pass for image-only pages (F-6): rulings in page space. */
export interface RasterPass {
  ops: ImageOpsTable;
  segments(): Promise<Seg[]>;
}

/**
 * A scanned page: no vector rules at all and one image over half the
 * page. Only then is the page rendered for raster rulings.
 */
function isScan(
  geom: PageGeometry,
  list: OperatorListLike,
  ops: ImageOpsTable,
  view: number[] | undefined,
): boolean {
  if (geom.skipped) return false;
  const lines = normaliseLines(geom.segments, geom.rects);
  if (lines.h.length || lines.v.length) return false;
  const v = (view?.length === 4 ? view : [0, 0, 612, 792]) as [
    number,
    number,
    number,
    number,
  ];
  return imageCoverage(list, ops, v) > SCAN_COVERAGE;
}

/** PDF font names (Wingdings, ZapfDingbats...) by pdf.js font id. */
function fontNamesOf(page: DetectPageLike, text: PageTextItems) {
  const names: Record<string, string> = {};
  for (const id of Object.keys(text.styles)) {
    let name = text.styles[id].fontFamily;
    try {
      if (page.commonObjs.has(id)) {
        const font = page.commonObjs.get(id) as { name?: string } | null;
        if (font?.name) name = font.name;
      }
    } catch {
      // Not loaded: keep the family pdf.js reported.
    }
    names[id] = name;
  }
  return names;
}

/** The pdf.js font fields read for advances (`fontExtraProperties: true`). */
interface PdfjsFontLike {
  widths?: Record<string, number>;
  defaultWidth?: number;
  isMonospace?: boolean;
  /** ToUnicodeMap (`_map`) or IdentityToUnicodeMap (`firstChar`), cloned. */
  toUnicode?: { _map?: (string | undefined)[]; firstChar?: number };
}

/**
 * Advance widths by character for each pdf.js font of the page, from the
 * font's own widths (by char code) through its ToUnicode map. A font
 * without readable widths is left out, so its runs use Helvetica widths.
 */
export function fontAdvancesOf(
  page: Pick<DetectPageLike, 'commonObjs'>,
  fontIds: readonly string[],
): Record<string, FontAdvances> {
  const out: Record<string, FontAdvances> = {};
  for (const id of fontIds) {
    let font: PdfjsFontLike | null = null;
    try {
      if (page.commonObjs.has(id))
        font = page.commonObjs.get(id) as PdfjsFontLike | null;
    } catch {
      font = null;
    }
    if (!font) continue;
    const byChar: Record<string, number> = {};
    const map = font.toUnicode?._map;
    const identity = !map && typeof font.toUnicode?.firstChar === 'number';
    for (const [code, width] of Object.entries(font.widths ?? {})) {
      if (!(width > 0)) continue;
      const ch = map
        ? map[Number(code)]
        : identity
          ? String.fromCodePoint(Number(code))
          : undefined;
      // A ligature or multi-character mapping has no single advance.
      if (ch && Array.from(ch).length === 1 && !(ch in byChar))
        byChar[ch] = width;
    }
    const fallback =
      font.defaultWidth && font.defaultWidth > 0
        ? font.defaultWidth
        : undefined;
    const listed = Object.keys(byChar).length > 0;
    if (!listed && !(font.isMonospace && fallback)) continue;
    out[id] = { byChar, fallback };
  }
  return out;
}

/**
 * Flat-form detection of one page (spec §8.2-8.4): operator list and text
 * content through extractGeometry, then the pure pipeline. Runs in the
 * render worker. With `raster`, a scanned page's rulings come from a
 * render instead (spec 11 "Scans as forms").
 */
export async function detectFromPage(
  page: DetectPageLike,
  pageIndex: number,
  OPS: OpsTable,
  raster?: RasterPass,
): Promise<PageDetectionResult> {
  const list = await page.getOperatorList();
  const text = textItemsFrom(
    await page.getTextContent({ includeMarkedContent: false }),
  );
  let geom = extractGeometry(
    list,
    OPS,
    text,
    fontNamesOf(page, text),
    fontAdvancesOf(page, Object.keys(text.styles)),
  );
  if (raster && isScan(geom, list, raster.ops, page.view))
    geom = { ...geom, segments: await raster.segments() };
  const result = detectPage(geom, pageIndex);
  if (geom.skipped) return { ...result, cells: [], signTargets: [] };
  const lines = normaliseLines(geom.segments, geom.rects);
  const { cells: built, combs } = buildCells(lines);
  // A run of character boxes snaps as one cell, like its comb field.
  const cells = [...built, ...combs.map((k) => k.cell)].map((c) => ({
    x: c.x,
    y: c.y,
    width: c.w,
    height: c.h,
  }));
  const signTargets = findSignTargets(geom, lines, built, pageIndex);
  return { ...result, cells, signTargets };
}

export interface DetectSummary {
  pageCount: number;
  sampled: number;
  /** `field` detections on the sampled pages. */
  fields: number;
  /** Extrapolated to the whole document (spec §5.3). */
  estimatedFields: number;
  hasAcroForm: boolean;
  hasXfa: boolean;
  hasTextLayer: boolean;
  flatForm: boolean;
}

export function summarise(
  pageCount: number,
  pages: PageDetection[],
  form: { hasAcroForm: boolean; hasXfa: boolean },
  hasTextLayer: boolean,
): DetectSummary {
  const fields = pages.reduce(
    (n, p) => n + p.fields.filter((f) => f.status === 'field').length,
    0,
  );
  const sampled = pages.length;
  return {
    pageCount,
    sampled,
    fields,
    estimatedFields: sampled ? Math.round((fields / sampled) * pageCount) : 0,
    hasAcroForm: form.hasAcroForm,
    hasXfa: form.hasXfa,
    hasTextLayer,
    flatForm: isFlatForm(pages, form.hasAcroForm),
  };
}
