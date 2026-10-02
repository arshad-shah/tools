import {
  anchoredOrigin,
  toPdfPlacement,
  visualSize,
  type Anchor,
  type EdgeAnchor,
  type PageFrame,
  type Placement,
  type Size,
} from './geometry';

/*
 * Where watermark, page-number and header/footer text goes on a page.
 * Pure (no pdf-lib): the writers in markup.ts and the workspace's live
 * preview call the same functions, so the preview anchors exactly where the
 * export draws (spec §6.3 mitigation 1). Text is measured by the caller.
 */

/** Width of a string at a size, and the text box height used for anchoring. */
export interface Measure {
  width(text: string, size: number): number;
  /** heightAtSize without the descender (what the writers anchor with). */
  height(size: number): number;
}

/** A line of text to draw: baseline origin and counter-clockwise rotation, page space. */
export interface PlacedText extends Placement {
  text: string;
  size: number;
}

export function watermarkPlacement(
  frame: PageFrame,
  box: Size,
  o: { position: Anchor; rotation: number; margin: number },
): Placement {
  return toPdfPlacement(
    frame,
    anchoredOrigin(visualSize(frame), o.position, box, o.rotation, o.margin),
    o.rotation,
  );
}

export function pageNumberPlacement(
  frame: PageFrame,
  box: Size,
  o: { position: EdgeAnchor; margin: number },
): Placement {
  return toPdfPlacement(
    frame,
    anchoredOrigin(visualSize(frame), o.position, box, 0, o.margin),
    0,
  );
}

export interface HeaderFooterSlots {
  left: string;
  center: string;
  right: string;
}

export interface HeaderFooterLayout {
  header: HeaderFooterSlots;
  footer: HeaderFooterSlots;
  fontSize: number;
  /** Points from the visual page edges. */
  margin: { top: number; bottom: number; side: number };
}

/**
 * Header and footer lines for one page, anchored to its visual edges
 * (rotation-aware): `texts` are the slot texts with tokens already filled.
 */
export function headerFooterPlacements(
  frame: PageFrame,
  o: HeaderFooterLayout,
  measure: Measure,
): PlacedText[] {
  const visual = visualSize(frame);
  const size = o.fontSize;
  const h = measure.height(size);
  const out: PlacedText[] = [];
  const row = (slots: HeaderFooterSlots, y: number) => {
    for (const align of ['left', 'center', 'right'] as const) {
      const text = slots[align];
      if (!text) continue;
      const w = measure.width(text, size);
      const x =
        align === 'left'
          ? o.margin.side
          : align === 'right'
            ? visual.width - o.margin.side - w
            : (visual.width - w) / 2;
      out.push({ text, size, ...toPdfPlacement(frame, { x, y }, 0) });
    }
  };
  row(o.header, visual.height - o.margin.top - h);
  row(o.footer, o.margin.bottom);
  return out;
}

/** Tokens {n} {total} {date} {filename}; unknown tokens are left as typed. */
export function formatHeaderFooter(
  template: string,
  ctx: {
    n: number;
    total: number;
    date: Date;
    filename: string;
    locale: string;
  },
): string {
  return template.replace(/\{(n|total|date|filename)\}/g, (_, key: string) => {
    if (key === 'n') return String(ctx.n);
    if (key === 'total') return String(ctx.total);
    if (key === 'filename') return ctx.filename;
    return ctx.date.toLocaleDateString(ctx.locale || undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  });
}

export type PageNumberFormat = 'n' | 'n-of-total' | 'page-n';
export const PAGE_NUMBER_FORMATS: Record<PageNumberFormat, string> = {
  n: '{n}',
  'n-of-total': '{n} / {total}',
  'page-n': 'Page {n}',
};

export function formatPageNumber(
  format: PageNumberFormat,
  n: number,
  total: number,
): string {
  return PAGE_NUMBER_FORMATS[format]
    .replace('{n}', String(n))
    .replace('{total}', String(total));
}
