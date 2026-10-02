import { ToolError } from '@/shared/lib/errors';
import { findOverlay, replaceOverlay } from '../page-map';
import { defineOperation, getOperation } from '../registry';
import type { AssetId, Box, PageId } from '../types';
import { hex, num, oneOf, opacity, text } from './annotate-params';
import { addOverlay, count, onPage } from './annotate-shared';
import { asRecord, box, str } from './validate';

export type ContentFont = 'Helvetica' | 'Times-Roman' | 'Courier' | 'unicode';
export const CONTENT_FONTS: readonly ContentFont[] = [
  'Helvetica',
  'Times-Roman',
  'Courier',
  'unicode',
];

export interface TextParams {
  id: string;
  pageId: PageId;
  rect: Box;
  /** Degrees counterclockwise about the box centre. */
  rotate: number;
  text: string;
  font: ContentFont;
  size: number;
  color: string;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
}

export interface ImageParams {
  id: string;
  pageId: PageId;
  rect: Box;
  rotate: number;
  assetId: AssetId;
  mime: 'image/png' | 'image/jpeg';
  opacity: number;
  keepAspect: boolean;
}

export interface ContentShapeParams {
  id: string;
  pageId: PageId;
  kind: 'rect' | 'ellipse' | 'line' | 'arrow';
  rect: Box;
  /**
   * Line and arrow ends as fractions (0..1) of `rect`, so moving or
   * resizing the object (object.move rewrites `rect`) carries them along.
   */
  from?: [number, number];
  to?: [number, number];
  stroke: string | null;
  fill: string | null;
  width: number;
  opacity: number;
  rotate: number;
}

const rotation = (v: unknown, what: string) =>
  v === undefined ? 0 : num(v, what, -360, 360);

const fraction = (v: unknown, what: string): [number, number] => {
  if (
    !Array.isArray(v) ||
    v.length !== 2 ||
    !v.every((n) => typeof n === 'number' && n >= 0 && n <= 1)
  )
    throw new ToolError('INVALID_INPUT', `${what}: bad line end`);
  return [v[0], v[1]];
};

export const contentText = defineOperation<TextParams>({
  type: 'content.text',
  v: 1,
  kind: 'overlay',
  mode: 'edit',
  validate(p) {
    const o = asRecord(p, 'Text');
    const body = text(o.text, 'Text');
    if (body.trim() === '')
      throw new ToolError('INVALID_INPUT', 'Text: type some text');
    return {
      id: str(o.id, 'Text'),
      pageId: str(o.pageId, 'Text'),
      rect: box(o.rect, 'Text'),
      rotate: rotation(o.rotate, 'Text'),
      text: body,
      font: oneOf(o.font, CONTENT_FONTS, 'Text'),
      size: num(o.size, 'Text', 4, 288),
      color: hex(o.color, 'Text'),
      align: oneOf(o.align, ['left', 'center', 'right'] as const, 'Text'),
      lineHeight: num(o.lineHeight ?? 1.2, 'Text', 0.8, 3),
    };
  },
  label: (p, ctx) => `Add text ${onPage(p.pageId, ctx)}`,
  summarize: (ops) => count(ops.length, 'text box', 'text boxes'),
  applyToView: addOverlay,
});

export const contentImage = defineOperation<ImageParams>({
  type: 'content.image',
  v: 1,
  kind: 'overlay',
  mode: 'edit',
  validate(p) {
    const o = asRecord(p, 'Image');
    return {
      id: str(o.id, 'Image'),
      pageId: str(o.pageId, 'Image'),
      rect: box(o.rect, 'Image'),
      rotate: rotation(o.rotate, 'Image'),
      assetId: str(o.assetId, 'Image'),
      mime: oneOf(o.mime, ['image/png', 'image/jpeg'] as const, 'Image'),
      opacity: opacity(o.opacity ?? 1, 'Image'),
      keepAspect: o.keepAspect !== false,
    };
  },
  label: (p, ctx) => `Add image ${onPage(p.pageId, ctx)}`,
  summarize: (ops) => count(ops.length, 'image'),
  assets: (p) => [p.assetId],
  applyToView: addOverlay,
});

const SHAPE_NAMES = {
  rect: 'rectangle',
  ellipse: 'ellipse',
  line: 'line',
  arrow: 'arrow',
} as const;

export const contentShape = defineOperation<ContentShapeParams>({
  type: 'content.shape',
  v: 1,
  kind: 'overlay',
  mode: 'edit',
  validate(p) {
    const o = asRecord(p, 'Shape');
    const kind = oneOf(
      o.kind,
      ['rect', 'ellipse', 'line', 'arrow'] as const,
      'Shape',
    );
    const out: ContentShapeParams = {
      id: str(o.id, 'Shape'),
      pageId: str(o.pageId, 'Shape'),
      kind,
      rect: box(o.rect, 'Shape'),
      stroke:
        o.stroke === null || o.stroke === undefined
          ? null
          : hex(o.stroke, 'Shape'),
      fill:
        o.fill === null || o.fill === undefined ? null : hex(o.fill, 'Shape'),
      width: num(o.width, 'Shape', 0.25, 50),
      opacity: opacity(o.opacity ?? 1, 'Shape'),
      rotate: rotation(o.rotate, 'Shape'),
    };
    if (kind === 'line' || kind === 'arrow') {
      out.from = fraction(o.from, 'Shape');
      out.to = fraction(o.to, 'Shape');
      out.fill = null;
      if (!out.stroke)
        throw new ToolError('INVALID_INPUT', 'Shape: a line needs a colour');
    } else if (!out.stroke && !out.fill)
      throw new ToolError(
        'INVALID_INPUT',
        'Shape: give it a fill or a stroke colour',
      );
    return out;
  },
  label: (p, ctx) => `Add ${SHAPE_NAMES[p.kind]} ${onPage(p.pageId, ctx)}`,
  summarize: (ops) => count(ops.length, 'shape'),
  applyToView: addOverlay,
});

/** Line ends in page space from their fractions of the rect. */
export function lineEnds(
  p: ContentShapeParams,
): [[number, number], [number, number]] {
  const at = (f: [number, number]): [number, number] => [
    p.rect.x + f[0] * p.rect.width,
    p.rect.y + f[1] * p.rect.height,
  ];
  return [at(p.from ?? [0, 0]), at(p.to ?? [1, 1])];
}

/** The rect and fractional ends for a line dragged from `a` to `b` (padded so it has an area). */
export function lineFrame(
  a: [number, number],
  b: [number, number],
  width: number,
): Pick<ContentShapeParams, 'rect' | 'from' | 'to'> {
  const pad = Math.max(1, width);
  const rect = {
    x: Math.min(a[0], b[0]) - pad,
    y: Math.min(a[1], b[1]) - pad,
    width: Math.abs(b[0] - a[0]) + 2 * pad,
    height: Math.abs(b[1] - a[1]) + 2 * pad,
  };
  const frac = (q: [number, number]): [number, number] => [
    (q[0] - rect.x) / rect.width,
    (q[1] - rect.y) / rect.height,
  ];
  return { rect, from: frac(a), to: frac(b) };
}

const UPDATABLE = new Set([
  'content.text',
  'content.image',
  'content.shape',
  'content.cover',
]);

/**
 * Changes a pending Edit object's settings (text, font, colours...) in the
 * view; geometry goes through object.move. The merged params are validated
 * by the object's own type, so a bad patch changes nothing.
 */
export const contentUpdate = defineOperation<{
  targetId: string;
  patch: Record<string, unknown>;
}>({
  type: 'content.update',
  v: 1,
  kind: 'overlay',
  mode: 'edit',
  noOutput: true,
  validate(p) {
    const o = asRecord(p, 'Edit object');
    const patch = asRecord(o.patch, 'Edit object');
    for (const k of ['id', 'pageId', 'rect', 'rotate'])
      if (k in patch)
        throw new ToolError(
          'INVALID_INPUT',
          `Edit object: ${k} cannot change here`,
        );
    return { targetId: str(o.targetId, 'Edit object'), patch };
  },
  label: (p, ctx) => {
    const page = ctx.pageOf(p.targetId);
    const n = page ? ctx.pageNumber(page) : null;
    return `Edit object${n ? ` on page ${n}` : ''}`;
  },
  applyToView(view, p) {
    const item = findOverlay(view, p.targetId);
    if (!item || view.hidden.has(p.targetId) || !UPDATABLE.has(item.type))
      throw new ToolError('INVALID_INPUT', 'This object no longer exists');
    const params = getOperation(item.type).validate({
      ...(item.params as object),
      ...p.patch,
    });
    return replaceOverlay(view, p.targetId, (it) => ({ ...it, params }));
  },
});

export const EDIT_CONTENT_OPS = [
  contentText,
  contentImage,
  contentShape,
  contentUpdate,
] as const;
