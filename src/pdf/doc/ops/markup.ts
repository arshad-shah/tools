import { ToolError } from '@/shared/lib/errors';
import {
  ANCHOR_OPTIONS,
  EDGE_ANCHOR_OPTIONS,
  trySelectPages,
  type Anchor,
  type EdgeAnchor,
  type PageSelection,
} from '@/pdf/edit/geometry';
import { withHidden, withOverlay } from '../page-map';
import { defineOperation } from '../registry';
import type { AssetId, DocView, Operation } from '../types';
import { hex, num, oneOf, opacity, text } from './annotate-params';
import { asRecord, str } from './validate';

export interface WatermarkParams {
  id: string;
  content:
    | { kind: 'text'; text: string; fontSize: number; color: string }
    | {
        kind: 'image';
        assetId: AssetId;
        format: 'png' | 'jpeg';
        widthFraction: number;
      };
  opacity: number;
  /** Degrees, counter-clockwise as seen on screen. */
  rotation: number;
  position: Anchor;
  margin: number;
  pages: PageSelection;
}

export interface PageNumbersParams {
  id: string;
  format: 'n' | 'n-of-total' | 'page-n';
  position: EdgeAnchor;
  startAt: number;
  pages: PageSelection;
  fontSize: number;
  margin: number;
}

export interface Slots {
  left: string;
  center: string;
  right: string;
}

export interface HeaderFooterParams {
  id: string;
  header: Slots;
  footer: Slots;
  fontSize: number;
  color: string;
  margin: { top: number; bottom: number; side: number };
  pages: PageSelection;
  /** Token values captured when the op is made (the document name and date, ms). */
  filename: string;
  date: number;
}

const bad = (m: string) => new ToolError('INVALID_INPUT', m);

function selection(v: unknown, what: string): PageSelection {
  const o = asRecord(v, what);
  if (o.mode === 'all') return { mode: 'all' };
  if (o.mode === 'ranges')
    return { mode: 'ranges', text: text(o.text, what, 500) };
  throw bad(`${what}: choose the pages`);
}

const slots = (v: unknown, what: string): Slots => {
  const o = asRecord(v, what);
  return {
    left: text(o.left ?? '', what, 200),
    center: text(o.center ?? '', what, 200),
    right: text(o.right ?? '', what, 200),
  };
};

/**
 * A markup op replaces the earlier one of its type: the view keeps the last
 * (hiding the others), so the summary counts one. The page selection must
 * fit the document as it is now.
 */
function supersede<P extends { pages: PageSelection }>(
  view: DocView,
  p: P,
  op: Operation<P>,
): DocView {
  const { error } = trySelectPages(p.pages, view.pages.length);
  if (error) throw bad(error);
  let next = view;
  for (const o of view.docOverlays)
    if (o.type === op.type && !view.hidden.has(o.opId))
      next = withHidden(next, o.opId);
  return withOverlay(next, {
    opId: op.id,
    type: op.type,
    pageId: null,
    params: p,
  });
}

const ANCHORS = ANCHOR_OPTIONS.map((o) => o.value);
const EDGES = EDGE_ANCHOR_OPTIONS.map((o) => o.value);

export const markupWatermark = defineOperation<WatermarkParams>({
  type: 'markup.watermark',
  v: 1,
  kind: 'overlay',
  mode: 'edit',
  validate(p) {
    const o = asRecord(p, 'Watermark');
    const c = asRecord(o.content, 'Watermark');
    let content: WatermarkParams['content'];
    if (c.kind === 'text') {
      const label = text(c.text, 'Watermark', 500).replace(/\s+/g, ' ').trim();
      if (!label) throw bad('Enter the watermark text');
      content = {
        kind: 'text',
        text: label,
        fontSize: num(c.fontSize, 'Watermark font size', 6, 400),
        color: hex(c.color, 'Watermark'),
      };
    } else if (c.kind === 'image') {
      content = {
        kind: 'image',
        assetId: str(c.assetId, 'Watermark'),
        format: oneOf(c.format, ['png', 'jpeg'] as const, 'Watermark'),
        widthFraction: num(c.widthFraction, 'Watermark image width', 0.01, 1),
      };
    } else throw bad('Watermark: choose text or an image');
    const op = opacity(o.opacity, 'Watermark');
    if (op === 0) throw bad('Opacity must be between 1% and 100%');
    return {
      id: str(o.id, 'Watermark'),
      content,
      opacity: op,
      rotation: num(o.rotation, 'Watermark rotation', -360, 360),
      position: oneOf(o.position, ANCHORS, 'Watermark'),
      margin: num(o.margin ?? 36, 'Watermark margin', 0, 500),
      pages: selection(o.pages, 'Watermark'),
    };
  },
  label: () => 'Add watermark',
  summarize: () => 'Watermark',
  assets: (p) => (p.content.kind === 'image' ? [p.content.assetId] : []),
  applyToView: supersede,
});

export const markupPageNumbers = defineOperation<PageNumbersParams>({
  type: 'markup.pageNumbers',
  v: 1,
  kind: 'overlay',
  mode: 'edit',
  validate(p) {
    const o = asRecord(p, 'Page numbers');
    if (!Number.isInteger(o.startAt) || (o.startAt as number) < 0)
      throw bad('Start number must be a whole number of 0 or more');
    return {
      id: str(o.id, 'Page numbers'),
      format: oneOf(
        o.format,
        ['n', 'n-of-total', 'page-n'] as const,
        'Page numbers',
      ),
      position: oneOf(o.position, EDGES, 'Page numbers'),
      startAt: o.startAt as number,
      pages: selection(o.pages, 'Page numbers'),
      fontSize: num(o.fontSize, 'Page number size', 6, 72),
      margin: num(o.margin ?? 24, 'Page number margin', 0, 500),
    };
  },
  label: () => 'Add page numbers',
  summarize: () => 'Page numbers',
  applyToView: supersede,
});

export const markupHeaderFooter = defineOperation<HeaderFooterParams>({
  type: 'markup.headerFooter',
  v: 1,
  kind: 'overlay',
  mode: 'edit',
  validate(p) {
    const o = asRecord(p, 'Header and footer');
    const m = asRecord(o.margin, 'Header and footer');
    const out: HeaderFooterParams = {
      id: str(o.id, 'Header and footer'),
      header: slots(o.header, 'Header'),
      footer: slots(o.footer, 'Footer'),
      fontSize: num(o.fontSize, 'Header and footer size', 4, 72),
      color: hex(o.color, 'Header and footer'),
      margin: {
        top: num(m.top, 'Top margin', 0, 500),
        bottom: num(m.bottom, 'Bottom margin', 0, 500),
        side: num(m.side, 'Side margin', 0, 500),
      },
      pages: selection(o.pages, 'Header and footer'),
      filename: text(o.filename ?? '', 'Header and footer', 500),
      date: num(o.date, 'Header and footer date', 0, 8.64e15),
    };
    const any = [out.header, out.footer].some(
      (s) => s.left || s.center || s.right,
    );
    if (!any) throw bad('Type a header or a footer');
    return out;
  },
  label: () => 'Add header and footer',
  summarize: () => 'Header and footer',
  applyToView: supersede,
});

export const MARKUP_OPS = [
  markupWatermark,
  markupPageNumbers,
  markupHeaderFooter,
] as const;
