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
  type SignTarget,
} from '@/pdf/detect';
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
 * render worker.
 */
export async function detectFromPage(
  page: DetectPageLike,
  pageIndex: number,
  OPS: OpsTable,
): Promise<PageDetectionResult> {
  const list = await page.getOperatorList();
  const text = textItemsFrom(
    await page.getTextContent({ includeMarkedContent: false }),
  );
  const geom = extractGeometry(list, OPS, text, fontNamesOf(page, text));
  const result = detectPage(geom, pageIndex);
  if (geom.skipped) return { ...result, cells: [], signTargets: [] };
  const lines = normaliseLines(geom.segments, geom.rects);
  const built = buildCells(lines).cells;
  const cells = built.map((c) => ({
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
