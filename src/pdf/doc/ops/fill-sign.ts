import { requireAll, withHidden, withOverlay } from '../page-map';
import { defineOperation, type LabelContext } from '../registry';
import type { DocView, OverlayItem, PageId } from '../types';
import {
  detectCorrectParams,
  flatFillParams,
  formSetValueParams,
  makeFillableParams,
  signPlaceParams,
  type DetectCorrectParams,
  type FlatFillParams,
  type FormSetValueParams,
  type MakeFillableField,
  type SignPlaceParams,
} from './fill-sign-params';
import { asRecord, plural } from './validate';

export type * from './fill-sign-params';

const onPage = (pageId: PageId, ctx: LabelContext) =>
  `page ${ctx.pageNumber(pageId) ?? '?'}`;

const count = (n: number, what: string, done: string) =>
  `${n} ${plural(n, what)} ${done}`;

/** Hides earlier, still-shown overlay items `match` picks (a later op supersedes them). */
function supersede(
  view: DocView,
  type: string,
  match: (item: OverlayItem) => boolean,
): DocView {
  let out = view;
  const all = [...view.docOverlays, ...[...view.overlays.values()].flat()];
  for (const item of all)
    if (item.type === type && !view.hidden.has(item.opId) && match(item))
      out = withHidden(out, item.opId);
  return out;
}

/** AcroForm value; the latest op per field name wins in the view. */
export const formSetValue = defineOperation<FormSetValueParams>({
  type: 'form.setValue',
  v: 1,
  kind: 'overlay',
  mode: 'fill-sign',
  validate: formSetValueParams,
  label: (p) => `Fill ${p.label ?? p.name}`,
  summarize: (ops) =>
    count(new Set(ops.map((o) => o.name)).size, 'field', 'filled'),
  applyToView(view, p, op) {
    const next = supersede(
      view,
      'form.setValue',
      (i) => (i.params as FormSetValueParams).name === p.name,
    );
    return withOverlay(next, {
      opId: op.id,
      type: op.type,
      pageId: null,
      params: p,
    });
  },
});

/** Text, tick, cross or date drawn as page content on a flat form. */
export const flatFill = defineOperation<FlatFillParams>({
  type: 'flat.fill',
  v: 1,
  kind: 'overlay',
  mode: 'fill-sign',
  validate: flatFillParams,
  label(p, ctx) {
    const page = onPage(p.pageId, ctx);
    if (p.restyle) return `Change text style on ${page}`;
    if (p.value === '') return `Clear field on ${page}`;
    if (p.kind === 'tick') return `Tick on ${page}`;
    if (p.kind === 'cross') return `Cross on ${page}`;
    return `Fill ${p.label ?? (p.kind === 'date' ? 'date' : 'text')} on ${page}`;
  },
  summarize: (ops) =>
    count(ops.filter((o) => o.value !== '').length, 'field', 'filled'),
  applyToView(view, p, op) {
    requireAll(view, [p.pageId]);
    const next = p.fieldId
      ? supersede(
          view,
          'flat.fill',
          (i) => (i.params as FlatFillParams).fieldId === p.fieldId,
        )
      : view;
    return withOverlay(next, {
      opId: op.id,
      type: op.type,
      pageId: p.pageId,
      params: p,
    });
  },
});

/** A picture of a signature (or initials) placed on a page. */
export const signPlace = defineOperation<SignPlaceParams>({
  type: 'sign.place',
  v: 1,
  kind: 'overlay',
  mode: 'fill-sign',
  validate: signPlaceParams,
  label: (p, ctx) =>
    `Place ${p.role === 'initials' ? 'initials' : 'signature'} on ${onPage(p.pageId, ctx)}`,
  summarize(ops) {
    const initials = ops.filter((o) => o.role === 'initials').length;
    const signatures = ops.length - initials;
    return [
      signatures ? `${signatures} ${plural(signatures, 'signature')}` : '',
      initials ? `${initials} initials` : '',
    ]
      .filter(Boolean)
      .join(' and ');
  },
  assets: (p) =>
    p.content.kind === 'image' ? [p.content.assetId] : [p.content.fontAsset],
  applyToView(view, p, op) {
    requireAll(view, [p.pageId]);
    return withOverlay(view, {
      opId: op.id,
      type: op.type,
      pageId: p.pageId,
      params: p,
    });
  },
});

const CORRECTION_LABELS: Record<DetectCorrectParams['action'], string> = {
  dismiss: 'Dismiss detected field',
  accept: 'Accept suggested field',
  add: 'Add field',
  resize: 'Resize field',
  retype: 'Change field type',
  split: 'Split field',
  merge: 'Merge fields',
};

/** A correction to detected fields (view only; Make fillable reads them). */
export const detectCorrect = defineOperation<DetectCorrectParams>({
  type: 'detect.correct',
  v: 1,
  kind: 'overlay',
  mode: 'fill-sign',
  noOutput: true,
  validate: detectCorrectParams,
  label: (p, ctx) =>
    p.action === 'add' && p.pageId
      ? `Add field on ${onPage(p.pageId, ctx)}`
      : CORRECTION_LABELS[p.action],
  applyToView: (view, p, op) =>
    withOverlay(view, { opId: op.id, type: op.type, pageId: null, params: p }),
});

/** Checkpoint: AcroForm fields become page content. */
export const formFlatten = defineOperation<Record<string, never>>({
  type: 'form.flatten',
  v: 1,
  kind: 'checkpoint',
  mode: 'fill-sign',
  validate(p) {
    asRecord(p ?? {}, 'Flatten form');
    return {};
  },
  label: () => 'Flatten form',
});

/** Checkpoint: accepted flat fields become real AcroForm fields. */
export const makeFillable = defineOperation<{ fields: MakeFillableField[] }>({
  type: 'flat.makeFillable',
  v: 1,
  kind: 'checkpoint',
  mode: 'fill-sign',
  validate: makeFillableParams,
  label: () => 'Make form fillable',
});

export const FILL_SIGN_OPS = [
  formSetValue,
  flatFill,
  signPlace,
  detectCorrect,
  formFlatten,
  makeFillable,
] as const;
