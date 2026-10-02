import { ToolError } from '@/shared/lib/errors';
import { findOverlay } from '../page-map';
import { defineOperation } from '../registry';
import { addOverlay, count, onPage } from './annotate-shared';
import {
  common,
  hex,
  num,
  opacity,
  oneOf,
  point,
  quads,
  STAMP_NAMES,
  STAMP_PRESETS,
  text,
  type FreeTextParams,
  type InkParams,
  type LineParams,
  type MarkupParams,
  type MarkupSubtype,
  type NoteParams,
  type ShapeParams,
  type StampParams,
} from './annotate-params';
import { asRecord, box, str } from './validate';

/** "2 highlights, 1 underline" from the values of `key`. */
function countBy<P>(
  ops: P[],
  key: (p: P) => string,
  names: Record<string, [string, string]>,
): string {
  const n = new Map<string, number>();
  for (const p of ops) n.set(key(p), (n.get(key(p)) ?? 0) + 1);
  return [...n].map(([k, c]) => count(c, names[k][0], names[k][1])).join(', ');
}

const MARKUP_LABEL: Record<MarkupSubtype, string> = {
  Highlight: 'Highlight text',
  Underline: 'Underline text',
  StrikeOut: 'Strike out text',
  Squiggly: 'Squiggly underline',
};
const MARKUP_COUNT: Record<string, [string, string]> = {
  Highlight: ['highlight', 'highlights'],
  Underline: ['underline', 'underlines'],
  StrikeOut: ['strikeout', 'strikeouts'],
  Squiggly: ['squiggly underline', 'squiggly underlines'],
};

export const annotMarkup = defineOperation<MarkupParams>({
  type: 'annot.markup',
  v: 1,
  kind: 'overlay',
  mode: 'annotate',
  validate(p) {
    const o = asRecord(p, 'Text markup');
    return {
      ...common(o, 'Text markup'),
      subtype: oneOf(
        o.subtype,
        ['Highlight', 'Underline', 'StrikeOut', 'Squiggly'] as const,
        'Text markup',
      ),
      quads: quads(o.quads, 'Text markup'),
      opacity: opacity(o.opacity, 'Text markup'),
      contents: text(o.contents ?? '', 'Text markup'),
    };
  },
  label: (p, ctx) => `${MARKUP_LABEL[p.subtype]} ${onPage(p.pageId, ctx)}`,
  summarize: (ops) => countBy(ops, (p) => p.subtype, MARKUP_COUNT),
  applyToView: addOverlay,
});

export const annotNote = defineOperation<NoteParams>({
  type: 'annot.note',
  v: 1,
  kind: 'overlay',
  mode: 'annotate',
  validate(p) {
    const o = asRecord(p, 'Note');
    let replyTo: NoteParams['replyTo'];
    if (o.replyTo !== undefined) {
      const r = asRecord(o.replyTo, 'Note');
      replyTo =
        r.kind === 'pending'
          ? { kind: 'pending', id: str(r.id, 'Note') }
          : { kind: 'existing', ref: str(r.ref, 'Note') };
    }
    return {
      ...common(o, 'Note'),
      at: point(o.at, 'Note'),
      icon: oneOf(o.icon, ['Comment', 'Note'] as const, 'Note'),
      contents: text(o.contents, 'Note'),
      ...(replyTo ? { replyTo } : {}),
    };
  },
  label: (p, ctx) =>
    `${p.replyTo ? 'Reply to note' : 'Add note'} ${onPage(p.pageId, ctx)}`,
  summarize: (ops) => {
    const replies = ops.filter((p) => p.replyTo).length;
    const notes = ops.length - replies;
    return [
      notes ? count(notes, 'note') : '',
      replies ? count(replies, 'reply', 'replies') : '',
    ]
      .filter(Boolean)
      .join(', ');
  },
  applyToView(view, p, op) {
    if (p.replyTo?.kind === 'pending') {
      const parent = findOverlay(view, p.replyTo.id);
      if (
        !parent ||
        view.hidden.has(p.replyTo.id) ||
        parent.type !== 'annot.note'
      )
        throw new ToolError('INVALID_INPUT', 'The note to reply to is gone');
    }
    return addOverlay(view, p, op);
  },
});

export const annotFreeText = defineOperation<FreeTextParams>({
  type: 'annot.freetext',
  v: 1,
  kind: 'overlay',
  mode: 'annotate',
  validate(p) {
    const o = asRecord(p, 'Text comment');
    return {
      ...common(o, 'Text comment'),
      rect: box(o.rect, 'Text comment'),
      text: text(o.text, 'Text comment'),
      fontSize: num(o.fontSize, 'Text comment', 4, 144),
      align: oneOf(
        o.align,
        ['left', 'center', 'right'] as const,
        'Text comment',
      ),
      border: Boolean(o.border),
    };
  },
  label: (p, ctx) => `Add text comment ${onPage(p.pageId, ctx)}`,
  summarize: (ops) => count(ops.length, 'text comment'),
  applyToView: addOverlay,
});

export const annotInk = defineOperation<InkParams>({
  type: 'annot.ink',
  v: 1,
  kind: 'overlay',
  mode: 'annotate',
  validate(p) {
    const o = asRecord(p, 'Drawing');
    if (!Array.isArray(o.strokes) || o.strokes.length === 0)
      throw new ToolError('INVALID_INPUT', 'Drawing: nothing drawn');
    return {
      ...common(o, 'Drawing'),
      strokes: o.strokes.map((s) => {
        if (!Array.isArray(s) || s.length === 0)
          throw new ToolError('INVALID_INPUT', 'Drawing: empty stroke');
        return s.map((pt) => point(pt, 'Drawing'));
      }),
      width: num(o.width, 'Drawing', 0.25, 50),
      opacity: opacity(o.opacity, 'Drawing'),
    };
  },
  label: (p, ctx) => `Draw ${onPage(p.pageId, ctx)}`,
  summarize: (ops) => count(ops.length, 'drawing'),
  applyToView: addOverlay,
});

export const annotShape = defineOperation<ShapeParams>({
  type: 'annot.shape',
  v: 1,
  kind: 'overlay',
  mode: 'annotate',
  validate(p) {
    const o = asRecord(p, 'Shape');
    return {
      ...common(o, 'Shape'),
      kind: oneOf(o.kind, ['Square', 'Circle'] as const, 'Shape'),
      rect: box(o.rect, 'Shape'),
      width: num(o.width, 'Shape', 0.25, 50),
      fill:
        o.fill === null || o.fill === undefined ? null : hex(o.fill, 'Shape'),
    };
  },
  label: (p, ctx) =>
    `Add ${p.kind === 'Square' ? 'rectangle' : 'ellipse'} ${onPage(p.pageId, ctx)}`,
  summarize: (ops) =>
    countBy(ops, (p) => p.kind, {
      Square: ['rectangle', 'rectangles'],
      Circle: ['ellipse', 'ellipses'],
    }),
  applyToView: addOverlay,
});

export const annotLine = defineOperation<LineParams>({
  type: 'annot.line',
  v: 1,
  kind: 'overlay',
  mode: 'annotate',
  validate(p) {
    const o = asRecord(p, 'Line');
    const from = point(o.from, 'Line');
    const to = point(o.to, 'Line');
    if (from[0] === to[0] && from[1] === to[1])
      throw new ToolError('INVALID_INPUT', 'Line: drag to draw the line');
    return {
      ...common(o, 'Line'),
      from,
      to,
      width: num(o.width, 'Line', 0.25, 50),
      arrowEnd: Boolean(o.arrowEnd),
    };
  },
  label: (p, ctx) =>
    `Add ${p.arrowEnd ? 'arrow' : 'line'} ${onPage(p.pageId, ctx)}`,
  summarize: (ops) =>
    countBy(ops, (p) => (p.arrowEnd ? 'arrow' : 'line'), {
      line: ['line', 'lines'],
      arrow: ['arrow', 'arrows'],
    }),
  applyToView: addOverlay,
});

export const annotStamp = defineOperation<StampParams>({
  type: 'annot.stamp',
  v: 1,
  kind: 'overlay',
  mode: 'annotate',
  validate(p) {
    const o = asRecord(p, 'Stamp');
    const out: StampParams = {
      ...common(o, 'Stamp'),
      rect: box(o.rect, 'Stamp'),
    };
    if (o.preset !== undefined)
      out.preset = oneOf(o.preset, STAMP_PRESETS, 'Stamp');
    if (o.label !== undefined) out.label = text(o.label, 'Stamp', 60);
    if (o.image !== undefined) {
      const img = asRecord(o.image, 'Stamp');
      out.image = {
        assetId: str(img.assetId, 'Stamp'),
        mime: oneOf(img.mime, ['image/png', 'image/jpeg'] as const, 'Stamp'),
      };
    }
    if (!out.preset && !out.label && !out.image)
      throw new ToolError('INVALID_INPUT', 'Stamp: choose a stamp');
    return out;
  },
  label: (p, ctx) =>
    `Add ${p.preset ? `${STAMP_NAMES[p.preset]} stamp` : p.image ? 'image stamp' : 'stamp'} ${onPage(p.pageId, ctx)}`,
  summarize: (ops) => count(ops.length, 'stamp'),
  assets: (p) => (p.image ? [p.image.assetId] : []),
  applyToView: addOverlay,
});

import { annotAuthor, annotDelete, annotUpdate } from './annotate-edit';

export { currentAuthor } from './annotate-edit';

export const ANNOTATE_OPS = [
  annotMarkup,
  annotNote,
  annotFreeText,
  annotInk,
  annotShape,
  annotLine,
  annotStamp,
  annotDelete,
  annotUpdate,
  annotAuthor,
] as const;
