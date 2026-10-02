import {
  buildCells,
  detectPage,
  extractGeometry,
  findSignTargets,
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
import { fontAdvancesOf } from './font-advances';
import { textItemsFrom } from './text';

export { fontAdvancesOf };

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
