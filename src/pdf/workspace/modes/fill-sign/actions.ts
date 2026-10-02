import { newId } from '@/shared/lib/id';
import { notify } from '@/shared/lib/notify';
import type { DetectedField, FieldType } from '@/pdf/detect';
import type {
  FlatFillParams,
  MakeFillableField,
  SignPlaceParams,
} from '@/pdf/doc/ops/fill-sign';
import type { Box, NewOperation, PageId } from '@/pdf/doc/types';
import { effectiveRotation } from '@/pdf/doc/page-map';
import type { ModeProps } from '../types';
import { detectedKey, fieldName, FREE, type ViewField } from './fields';
import { fillSign, type ReadySignature } from './store';
import { lastUsed, remember, type FieldStyle } from './text-style';
import { nextEmpty, tabOrder } from './tab-order';

/** A clicked or typed value as the op that writes it (null: nothing to do). */
export function valueOp(f: ViewField, value: string): NewOperation | null {
  if (f.origin === 'widget') {
    const w = f.widget!;
    const v =
      w.kind === 'checkbox'
        ? value !== ''
        : w.kind === 'radio'
          ? value
            ? (w.onValue ?? '')
            : ''
          : value;
    return {
      type: 'form.setValue',
      params: { name: w.fieldName, value: v, label: f.label ?? w.fieldName },
    };
  }
  if (value === f.value) return null;
  const kind: FlatFillParams['kind'] =
    f.type === 'tick'
      ? f.origin === 'free' && f.mark === 'cross'
        ? 'cross'
        : 'tick'
      : f.type === 'date'
        ? 'date'
        : 'text';
  const params: FlatFillParams = {
    id: newId(),
    pageId: f.page.id,
    rect: f.rect,
    kind,
    value,
    fieldId: f.key,
    ...(f.label ? { label: f.label } : {}),
    ...(f.type === 'multiline' ? { multiline: true } : {}),
    ...styleParams(f.style),
  };
  return { type: 'flat.fill', params };
}

/** The style keys a flat.fill takes (comb 0 means off). */
export function styleParams(
  s: Partial<FieldStyle> | undefined,
): Partial<FlatFillParams> {
  if (!s) return {};
  return {
    ...(s.size !== undefined ? { size: s.size } : {}),
    ...(s.color !== undefined ? { color: s.color } : {}),
    ...(s.spacing ? { spacing: s.spacing } : {}),
    ...(s.comb ? { comb: s.comb } : {}),
  };
}

/** New text settings for a flat text field or box: one "Change text style" step. */
export function restyle(
  ctx: ModeProps,
  f: ViewField,
  style: FieldStyle,
): string | null {
  const kind: FlatFillParams['kind'] = f.type === 'date' ? 'date' : 'text';
  const ops = ctx.doc.dispatch({
    type: 'flat.fill',
    params: {
      id: newId(),
      pageId: f.page.id,
      rect: f.rect,
      kind,
      value: f.value,
      fieldId: f.key,
      restyle: true,
      ...(f.label && f.origin !== 'free' ? { label: f.label } : {}),
      ...styleParams(style),
    },
  });
  if (!ops.length) return null;
  remember(ctx.doc.state.id, {
    size: style.size,
    color: style.color,
    spacing: style.spacing,
  });
  return ops[0].id;
}

/** Writes a value; returns whether it applied. */
export function commitValue(
  ctx: ModeProps,
  f: ViewField,
  value: string,
): boolean {
  // Text settings still settling go in with the value.
  const pending = fillSign.get().styling;
  if (pending?.key === f.key) {
    fillSign.set({ styling: null });
    f = { ...f, style: pending.style };
    if (value === f.value) {
      const kept = restyle(ctx, f, pending.style);
      return kept !== null;
    }
  }
  const op = valueOp(f, value);
  if (!op) return true;
  return ctx.doc.dispatch(op).length > 0;
}

/** Tick fields and radio options toggle on activation. */
export const toggles = (f: ViewField) =>
  f.type === 'tick' || f.type === 'radio';

/** Moves the inline editor to the next empty field in Tab order. */
export function advance(
  ctx: ModeProps,
  fields: readonly ViewField[],
  fromKey: string | null,
  dir: 1 | -1 = 1,
): ViewField | null {
  const next = nextEmpty(tabOrder(fields), fromKey, dir);
  fillSign.set({
    editing: next && !toggles(next) ? next.key : null,
    focusKey: next?.key ?? fromKey,
  });
  if (next) ctx.doc.announce(fieldName(next));
  else ctx.doc.announce('No empty fields left');
  return next;
}

const correction = (ctx: ModeProps, params: Record<string, unknown>): boolean =>
  ctx.doc.dispatch({ type: 'detect.correct', params }).length > 0;

export const dismissField = (ctx: ModeProps, f: ViewField) =>
  correction(ctx, { action: 'dismiss', fieldIds: [f.key] });
export const acceptField = (ctx: ModeProps, f: ViewField) =>
  correction(ctx, { action: 'accept', fieldIds: [f.key] });
export const retypeField = (ctx: ModeProps, f: ViewField, type: FieldType) =>
  correction(ctx, { action: 'retype', fieldIds: [f.key], type });
export const resizeField = (ctx: ModeProps, f: ViewField, rect: Box) =>
  correction(ctx, { action: 'resize', fieldIds: [f.key], rect });

/** Two equal halves along the long axis (spec §8.5). */
export function splitField(ctx: ModeProps, f: ViewField): boolean {
  const d = f.detected!;
  const r = f.rect;
  const wide = r.width >= r.height;
  const parts: DetectedField[] = [0, 1].map((i) => ({
    ...d,
    id: `${d.id}:split:${i}`,
    status: 'field',
    rect: wide
      ? { ...r, x: r.x + (i * r.width) / 2, width: r.width / 2 }
      : { ...r, y: r.y + ((1 - i) * r.height) / 2, height: r.height / 2 },
  }));
  return correction(ctx, { action: 'split', fieldIds: [f.key], parts });
}

/** The adjacent detected field on the same row, to the right. */
export function mergeCandidate(
  fields: readonly ViewField[],
  f: ViewField,
): ViewField | null {
  const cy = f.rect.y + f.rect.height / 2;
  return (
    fields
      .filter(
        (g) =>
          g.origin === 'detected' &&
          g.key !== f.key &&
          g.page.id === f.page.id &&
          g.rect.x >= f.rect.x + f.rect.width - 4 &&
          g.rect.y <= cy &&
          g.rect.y + g.rect.height >= cy,
      )
      .sort((a, b) => a.rect.x - b.rect.x)[0] ?? null
  );
}

export function mergeFields(ctx: ModeProps, a: ViewField, b: ViewField) {
  const x = Math.min(a.rect.x, b.rect.x);
  const y = Math.min(a.rect.y, b.rect.y);
  const rect = {
    x,
    y,
    width: Math.max(a.rect.x + a.rect.width, b.rect.x + b.rect.width) - x,
    height: Math.max(a.rect.y + a.rect.height, b.rect.y + b.rect.height) - y,
  };
  const part: DetectedField = {
    ...a.detected!,
    id: `${a.detected!.id}:merged`,
    status: 'field',
    rect,
  };
  return correction(ctx, {
    action: 'merge',
    fieldIds: [a.key, b.key],
    parts: [part],
  });
}

/** A field drawn by hand ("Add field"). */
export function addField(
  ctx: ModeProps,
  pageId: PageId,
  pageIndex: number,
  rect: Box,
  type: FieldType = 'text',
): string | null {
  const field: DetectedField = {
    id: 'added',
    pageIndex,
    rect,
    type,
    label: null,
    autofill: null,
    confidence: 1,
    status: 'field',
    source: 'cell',
  };
  const ops = ctx.doc.dispatch({
    type: 'detect.correct',
    params: { action: 'add', fieldIds: [], field, pageId },
  });
  return ops.length ? detectedKey(pageId, `added:${ops[0].id}`) : null;
}

/**
 * A text box at the current page's centre, ready to type (plan R39: the
 * keyboard path to click-anywhere text).
 */
export function addTextAtCentre(ctx: ModeProps): void {
  const page = ctx.doc.view.pages.find((p) => p.id === ctx.doc.currentPage);
  if (!page) return;
  const g = ctx.doc.pageGeom(page);
  const box = page.crop ?? {
    x: g.view[0],
    y: g.view[1],
    width: g.view[2] - g.view[0],
    height: g.view[3] - g.view[1],
  };
  const style = { ...lastUsed(ctx.doc.state.id), comb: 0 };
  const h = 1.25 * style.size + 4;
  fillSign.set({
    draft: {
      pageId: page.id,
      rect: {
        x: box.x + box.width / 2 - 80,
        y: box.y + box.height / 2 - h / 2,
        width: 160,
        height: h,
      },
      kind: 'text',
      style,
    },
    barClosed: null,
    typing: null,
  });
}

/**
 * "Add field" from the keyboard (plan C-12): a 120 x 20 field at the
 * current page's centre, shown with resize handles (Alt with the arrow
 * keys resizes it, the arrows move it).
 */
export function addFieldAtCentre(ctx: ModeProps): void {
  const page = ctx.doc.view.pages.find((p) => p.id === ctx.doc.currentPage);
  if (!page || page.blank) return;
  const g = ctx.doc.pageGeom(page);
  const box = page.crop ?? {
    x: g.view[0],
    y: g.view[1],
    width: g.view[2] - g.view[0],
    height: g.view[3] - g.view[1],
  };
  const key = addField(ctx, page.id, page.index, {
    x: box.x + box.width / 2 - 60,
    y: box.y + box.height / 2 - 10,
    width: 120,
    height: 20,
  });
  if (key) {
    fillSign.set({ resizing: key, showDetected: true });
    ctx.doc.announce('Field added. Use Alt with the arrow keys to resize it');
  }
}

/** A free fill (click anywhere): its own field id so later edits supersede it. */
export function placeFree(
  ctx: ModeProps,
  pageId: PageId,
  rect: Box,
  kind: FlatFillParams['kind'],
  value: string,
  style?: Partial<FieldStyle>,
): { fieldId: string; opId: string } | null {
  const fieldId = `${FREE}${newId()}`;
  const ops = ctx.doc.dispatch({
    type: 'flat.fill',
    params: {
      id: newId(),
      pageId,
      rect,
      kind,
      value,
      fieldId,
      ...(kind === 'text' || kind === 'date' ? styleParams(style) : {}),
    },
  });
  return ops.length ? { fieldId, opId: ops[0].id } : null;
}

/** The largest box of the signature's aspect that fits in `rect`, centred. */
export function fitAspect(rect: Box, aspect: number): Box {
  const width = Math.min(rect.width, rect.height * aspect);
  const height = width / aspect;
  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  };
}

/** Places a ready signature; `rect` is page space as displayed. */
export function placeSignature(
  ctx: ModeProps,
  pageId: PageId,
  rect: Box,
  sig: ReadySignature,
  role: SignPlaceParams['role'],
): string | null {
  const ops = ctx.doc.dispatch({
    type: 'sign.place',
    params: {
      id: newId(),
      pageId,
      rect,
      rotate: 0,
      content: sig.content,
      role,
    },
  });
  if (!ops.length) return null;
  ctx.selection.selectObjects([ops[0].id]);
  fillSign.set({ justPlaced: ops[0].id });
  return ops[0].id;
}

/** A signature box centred on a point: 180pt wide, or 60pt for initials. */
export function signatureBoxAt(
  point: { x: number; y: number },
  sig: ReadySignature,
  role: SignPlaceParams['role'],
  quarterTurned: boolean,
): Box {
  const w = role === 'initials' ? 60 : 180;
  const h = w / sig.aspect;
  const [width, height] = quarterTurned ? [h, w] : [w, h];
  return { x: point.x - width / 2, y: point.y - height / 2, width, height };
}

/** Whether the page shows a quarter turn (its box axes swap on screen). */
export const quarterTurned = (ctx: ModeProps, pageId: PageId) => {
  const page = ctx.doc.view.pages.find((p) => p.id === pageId);
  if (!page) return false;
  const r = effectiveRotation(page, ctx.doc.state.sources[page.source]);
  return r === 90 || r === 270;
};

/** Accepted detected fields as Make fillable input, with their current values. */
export function fillableFields(
  fields: readonly ViewField[],
): MakeFillableField[] {
  return fields
    .filter((f) => f.origin === 'detected' && f.status === 'field')
    .map((f) => ({
      pageId: f.page.id,
      rect: f.rect,
      type: f.type as FieldType,
      label: f.label,
      ...(f.value ? { value: f.value } : {}),
    }));
}

/**
 * Make fillable (spec §8.5): flat fills of the accepted fields become the
 * new fields' values, so they are removed first (one step); if the
 * checkpoint does not complete, that step is undone again.
 */
export async function makeFillable(
  ctx: ModeProps,
  fields: readonly ViewField[],
): Promise<void> {
  const accepted = fillableFields(fields);
  if (accepted.length === 0) {
    notify.info('Accept at least one detected field first');
    return;
  }
  const n = accepted.length;
  const confirmText = `Turns ${n} accepted ${n === 1 ? 'field' : 'fields'} into real form fields.`;
  const fills = fields
    .filter(
      (f) => f.origin === 'detected' && f.status === 'field' && f.fillOpId,
    )
    .map((f) => ({ type: 'object.remove', params: { targetId: f.fillOpId } }));
  let removed = false;
  if (fills.length) {
    removed =
      ctx.doc.dispatch(fills, 'Move filled values into form fields').length > 0;
    if (!removed) return;
  }
  let report = null;
  try {
    report = await ctx.doc.runCheckpoint(
      'flat.makeFillable',
      { fields: accepted },
      { title: 'Making the form fillable', confirm: confirmText },
    );
  } finally {
    if (!report && removed) ctx.doc.undo();
  }
}

export async function flatten(ctx: ModeProps): Promise<void> {
  await ctx.doc.runCheckpoint(
    'form.flatten',
    {},
    {
      title: 'Flattening the form',
      confirm:
        'Turns form fields into page content. Fields can no longer be edited.',
    },
  );
}
