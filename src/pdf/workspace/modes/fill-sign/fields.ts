import {
  dedupeAgainstWidgets,
  type AutofillKey,
  type DetectedField,
  type FieldType,
} from '@/pdf/detect';
import { detectionKey, type DetectionCache } from '@/pdf/doc/detection';
import type {
  DetectCorrectParams,
  FlatFillParams,
} from '@/pdf/doc/ops/fill-sign';
import type {
  Box,
  DocView,
  OpId,
  PageId,
  PageRef,
  SourceId,
} from '@/pdf/doc/types';
import type { FormInfo, WidgetInfo } from '@/pdf/render/form-info';
import type { FormValue } from '@/pdf/edit/forms';
import type { FieldStyle } from './text-style';

/** The text settings a fill's params carry. */
export const styleOf = (p: FlatFillParams): Partial<FieldStyle> => ({
  ...(p.size !== undefined ? { size: p.size } : {}),
  ...(p.color !== undefined ? { color: p.color } : {}),
  ...(p.spacing !== undefined ? { spacing: p.spacing } : {}),
  ...(p.comb !== undefined ? { comb: p.comb } : {}),
  ...(p.cells !== undefined ? { cells: p.cells } : {}),
});

export type ViewFieldType = FieldType | 'radio' | 'choice';

/** One fillable place on a page: an AcroForm widget or a detected field. */
export interface ViewField {
  /** Widgets: `widget:{name}:{n}`; detected: `{pageId}/{detector id}`. */
  key: string;
  page: PageRef;
  pageNumber: number;
  rect: Box;
  type: ViewFieldType;
  label: string | null;
  autofill: AutofillKey | null;
  status: 'field' | 'suggested';
  /** free: placed by clicking anywhere (a flat fill with no detected field). */
  origin: 'widget' | 'detected' | 'free';
  /** Free marks: tick or cross. */
  mark?: 'tick' | 'cross';
  widget?: WidgetInfo;
  detected?: DetectedField;
  /** Display value ('' when empty; ticks 'yes'). */
  value: string;
  filled: boolean;
  /** The flat.fill op that shows the value (detected fields). */
  fillOpId: OpId | null;
  /** Text settings of the latest fill (flat text fields), if any were set. */
  style?: Partial<FieldStyle>;
}

export const detectedKey = (pageId: PageId, fieldId: string) =>
  `${pageId}/${fieldId}`;
export const widgetKey = (name: string, n: number) => `widget:${name}:${n}`;

const visible = (view: DocView, opId: OpId) => !view.hidden.has(opId);

/** Field id prefix of free fills. */
export const FREE = 'free:';

/** Current AcroForm values: the PDF's own, then form.setValue ops. */
function formValues(view: DocView): Map<string, FormValue> {
  const out = new Map<string, FormValue>();
  for (const o of view.docOverlays)
    if (o.type === 'form.setValue' && visible(view, o.opId)) {
      const p = o.params as { name: string; value: FormValue };
      out.set(p.name, p.value);
    }
  return out;
}

function widgetFields(
  view: DocView,
  info: FormInfo,
  pages: PageRef[],
  number: (id: PageId) => number,
): ViewField[] {
  const set = formValues(view);
  const counts = new Map<string, number>();
  const out: ViewField[] = [];
  for (const w of info.widgets) {
    const n = counts.get(w.fieldName) ?? 0;
    counts.set(w.fieldName, n + 1);
    // Signature fields are places to sign (SignTargetsOverlay), not values.
    if (w.kind === 'unsupported' || w.kind === 'signature') continue;
    const value = set.has(w.fieldName) ? set.get(w.fieldName)! : w.value;
    const shown = pages.filter((p) => p.index === w.pageIndex);
    for (const page of shown) {
      const display =
        w.kind === 'checkbox'
          ? value === true
            ? 'yes'
            : ''
          : w.kind === 'radio'
            ? value === w.onValue
              ? 'yes'
              : ''
            : Array.isArray(value)
              ? value.join(', ')
              : String(value === false ? '' : value);
      out.push({
        key:
          widgetKey(w.fieldName, n) + (shown.length > 1 ? `@${page.id}` : ''),
        page,
        pageNumber: number(page.id),
        rect: w.rect,
        type:
          w.kind === 'text'
            ? w.multiline
              ? 'multiline'
              : 'text'
            : w.kind === 'checkbox'
              ? 'tick'
              : w.kind === 'radio'
                ? 'radio'
                : 'choice',
        label: w.label ?? w.fieldName,
        autofill: null,
        status: 'field',
        origin: 'widget',
        widget: w,
        value: display,
        filled: display !== '',
        fillOpId: null,
      });
    }
  }
  return out;
}

/** Applies detect.correct ops, in log order, to one page's detected fields. */
export function applyCorrections(
  fields: Map<string, DetectedField & { pageId: PageId }>,
  corrections: { opId: OpId; params: DetectCorrectParams }[],
): void {
  for (const { opId, params: c } of corrections) {
    const targets = c.fieldIds.filter((k) => fields.has(k));
    switch (c.action) {
      case 'dismiss':
        targets.forEach((k) => fields.delete(k));
        break;
      case 'accept':
        for (const k of targets)
          fields.set(k, { ...fields.get(k)!, status: 'field' });
        break;
      case 'resize':
        for (const k of targets)
          fields.set(k, { ...fields.get(k)!, rect: c.rect! });
        break;
      case 'retype':
        for (const k of targets)
          fields.set(k, { ...fields.get(k)!, type: c.type! });
        break;
      case 'add':
        fields.set(detectedKey(c.pageId!, `added:${opId}`), {
          ...c.field!,
          id: `added:${opId}`,
          status: 'field',
          pageId: c.pageId!,
        });
        break;
      case 'split':
      case 'merge': {
        if (targets.length === 0) break;
        const pageId = fields.get(targets[0])!.pageId;
        targets.forEach((k) => fields.delete(k));
        for (const part of c.parts!)
          fields.set(detectedKey(pageId, part.id), { ...part, pageId });
        break;
      }
    }
  }
}

/**
 * Every field the overlay shows, in view page order (spec §8.1): AcroForm
 * widgets of the current base, plus detections that do not overlap one
 * (IoU < 0.3), with the document's corrections and fills applied.
 */
export function viewFields(
  view: DocView,
  baseSource: SourceId,
  detection: DetectionCache | undefined,
  forms: Record<SourceId, FormInfo | undefined>,
): ViewField[] {
  const number = (id: PageId) => view.pages.findIndex((p) => p.id === id) + 1;
  const out: ViewField[] = [];
  const baseInfo = forms[baseSource];
  const basePages = view.pages.filter(
    (p) => !p.blank && p.source === baseSource,
  );
  if (baseInfo) out.push(...widgetFields(view, baseInfo, basePages, number));

  const detected = new Map<string, DetectedField & { pageId: PageId }>();
  for (const page of view.pages) {
    if (page.blank) continue;
    const d = detection?.pages[detectionKey(page.source, page.index)];
    if (!d) continue;
    const widgets = (forms[page.source]?.widgets ?? [])
      .filter((w) => w.pageIndex === page.index)
      .map((w) => ({ pageIndex: page.index, rect: w.rect }));
    for (const f of dedupeAgainstWidgets(d.fields, widgets))
      detected.set(detectedKey(page.id, f.id), { ...f, pageId: page.id });
  }
  applyCorrections(
    detected,
    view.docOverlays
      .filter((o) => o.type === 'detect.correct' && visible(view, o.opId))
      .map((o) => ({ opId: o.opId, params: o.params as DetectCorrectParams })),
  );

  const byPage = new Map(view.pages.map((p) => [p.id, p]));
  const fills = new Map<
    string,
    { value: string; opId: OpId; style: Partial<FieldStyle> }
  >();
  for (const [pageId, items] of view.overlays)
    for (const o of items) {
      const p = o.params as FlatFillParams;
      if (o.type !== 'flat.fill' || !p.fieldId || !visible(view, o.opId))
        continue;
      fills.set(p.fieldId, { value: p.value, opId: o.opId, style: styleOf(p) });
      const page = byPage.get(pageId);
      if (!p.fieldId.startsWith(FREE) || !page || p.value === '') continue;
      const mark = p.kind === 'tick' || p.kind === 'cross';
      out.push({
        key: p.fieldId,
        page,
        pageNumber: number(page.id),
        rect: p.rect,
        type: mark ? 'tick' : p.kind === 'date' ? 'date' : 'text',
        label: mark ? (p.kind === 'tick' ? 'Tick' : 'Cross') : 'Text',
        autofill: null,
        status: 'field',
        origin: 'free',
        ...(mark ? { mark: p.kind as 'tick' | 'cross' } : {}),
        value: p.value,
        filled: true,
        fillOpId: o.opId,
        style: styleOf(p),
      });
    }

  const signed = (pageId: PageId, r: Box) =>
    (view.overlays.get(pageId) ?? []).some((o) => {
      if (o.type !== 'sign.place' || !visible(view, o.opId)) return false;
      const s = (o.params as { rect: Box }).rect;
      const cx = s.x + s.width / 2;
      const cy = s.y + s.height / 2;
      return (
        cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height
      );
    });
  for (const [key, f] of detected) {
    const page = byPage.get(f.pageId);
    if (!page) continue;
    const fill = fills.get(key);
    const value =
      fill?.value ??
      (f.type === 'signature' && signed(page.id, f.rect) ? 'signed' : '');
    out.push({
      key,
      page,
      pageNumber: number(page.id),
      rect: f.rect,
      type: f.type,
      label: f.label,
      autofill: f.autofill,
      status: f.status,
      origin: 'detected',
      detected: f,
      value,
      filled: value !== '',
      fillOpId: fill?.opId ?? null,
      // Character boxes start as comb text; once filled, the fill's settings rule.
      ...(fill
        ? { style: fill.style }
        : f.cellCount
          ? {
              style: {
                comb: f.cellCount,
                ...(f.cellCentres ? { cells: f.cellCentres } : {}),
              },
            }
          : {}),
    });
  }
  return out.sort((a, b) => a.pageNumber - b.pageNumber);
}

const TYPE_NAMES: Record<ViewFieldType, string> = {
  text: 'Text',
  multiline: 'Text',
  tick: 'Tick',
  date: 'Date',
  signature: 'Signature',
  radio: 'Option',
  choice: 'Choice',
};

/** e.g. "Text field: Surname, empty" (spec §8.5, plan C-12). */
export const fieldName = (f: ViewField) =>
  `${TYPE_NAMES[f.type]} field: ${f.label ?? 'unlabelled'}, ${f.filled ? 'filled' : 'empty'}`;
