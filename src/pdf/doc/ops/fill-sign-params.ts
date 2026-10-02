import { ToolError } from '@/shared/lib/errors';
import type { CandidateSource, DetectedField, FieldType } from '@/pdf/detect';
import type { FormValue } from '@/pdf/edit/forms';
import type { Box, PageId } from '../types';
import { asRecord, box, str } from './validate';

export * from './sign-params';

/*
 * Parameter shapes and validators of the Fill & Sign ops (plan C-10).
 * Validators run on dispatch and on autosave restore.
 */

export type FlatFillKind = 'text' | 'tick' | 'cross' | 'date';

export interface FormSetValueParams {
  name: string;
  value: FormValue;
  /** The field's user-facing name for labels; the name is used without it. */
  label?: string;
}

export interface FlatFillParams {
  id: string;
  pageId: PageId;
  rect: Box;
  kind: FlatFillKind;
  /** '' clears the field. */
  value: string;
  /** The detected field it fills (later fills of it supersede earlier ones). */
  fieldId?: string;
  label?: string;
  size?: number;
  multiline?: boolean;
  /** Text colour, '#rrggbb' (default black). */
  color?: string;
  /** Letter spacing in points (PDF Tc), single-line text only. */
  spacing?: number;
  /** Character boxes: this many equal cells, one character in each. */
  comb?: number;
  /** Only the text settings changed (the undo label says so). */
  restyle?: true;
}

export type CorrectionAction =
  | 'dismiss'
  | 'accept'
  | 'add'
  | 'resize'
  | 'retype'
  | 'split'
  | 'merge';

export interface DetectCorrectParams {
  action: CorrectionAction;
  /** View keys of the fields it changes (see doc/detection.ts fieldKey). */
  fieldIds: string[];
  /** 'add': the new field. */
  field?: DetectedField;
  /** 'add': the page the new field sits on. */
  pageId?: PageId;
  rect?: Box;
  type?: FieldType;
  /** 'split' and 'merge': the fields that replace `fieldIds`. */
  parts?: DetectedField[];
}

export interface MakeFillableField {
  pageId: PageId;
  rect: Box;
  type: FieldType;
  label: string | null;
  value?: string;
}

const bad = (m: string) => new ToolError('INVALID_INPUT', m);

export const FIELD_TYPES: readonly FieldType[] = [
  'text',
  'multiline',
  'tick',
  'date',
  'signature',
];
const SOURCES: readonly CandidateSource[] = [
  'cell',
  'trailing',
  'underscore',
  'ruled',
  'checkbox-vector',
  'checkbox-glyph',
  'date',
];
const ACTIONS: readonly CorrectionAction[] = [
  'dismiss',
  'accept',
  'add',
  'resize',
  'retype',
  'split',
  'merge',
];
const HEX = /^#[0-9a-f]{6}$/i;

const oneOf = <T extends string>(
  v: unknown,
  list: readonly T[],
  what: string,
): T => {
  if (!list.includes(v as T)) throw bad(`${what}: unknown value`);
  return v as T;
};
const optStr = (v: unknown, what: string): string | undefined => {
  if (v === undefined) return undefined;
  if (typeof v !== 'string') throw bad(`${what}: expected text`);
  return v;
};
const num = (v: unknown, what: string): number => {
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw bad(`${what}: expected a number`);
  return v;
};

export function formValue(v: unknown, what: string): FormValue {
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  if (Array.isArray(v) && v.every((x) => typeof x === 'string'))
    return v as string[];
  throw bad(`${what}: expected a value`);
}

export function detectedField(v: unknown, what: string): DetectedField {
  const o = asRecord(v, what);
  const label = o.label === null ? null : optStr(o.label, what);
  if (label === undefined) throw bad(`${what}: expected a label or none`);
  const autofill = o.autofill === null ? null : optStr(o.autofill, what);
  if (autofill === undefined) throw bad(`${what}: expected a key or none`);
  return {
    id: str(o.id, what),
    pageIndex: num(o.pageIndex, what),
    rect: box(o.rect, what),
    type: oneOf(o.type, FIELD_TYPES, what),
    label,
    autofill: autofill as DetectedField['autofill'],
    confidence: num(o.confidence, what),
    status: oneOf(o.status, ['field', 'suggested'] as const, what),
    source: oneOf(o.source, SOURCES, what),
    ...(o.prechecked !== undefined
      ? { prechecked: o.prechecked === true }
      : {}),
    ...(typeof o.table === 'number' ? { table: o.table } : {}),
    ...(typeof o.row === 'number' ? { row: o.row } : {}),
    ...(typeof o.col === 'number' ? { col: o.col } : {}),
  };
}

export function formSetValueParams(p: unknown): FormSetValueParams {
  const o = asRecord(p, 'Fill field');
  const label = optStr(o.label, 'Fill field');
  return {
    name: str(o.name, 'Fill field'),
    value: formValue(o.value, 'Fill field'),
    ...(label ? { label } : {}),
  };
}

export function flatFillParams(p: unknown): FlatFillParams {
  const what = 'Fill';
  const o = asRecord(p, what);
  if (typeof o.value !== 'string') throw bad(`${what}: expected text`);
  if (
    o.size !== undefined &&
    !(typeof o.size === 'number' && o.size > 0 && o.size <= 200)
  )
    throw bad(`${what}: the text size must be between 0 and 200`);
  const fieldId = optStr(o.fieldId, what);
  const label = optStr(o.label, what);
  if (
    o.color !== undefined &&
    (typeof o.color !== 'string' || !HEX.test(o.color))
  )
    throw bad(`${what}: bad text colour`);
  if (
    o.spacing !== undefined &&
    !(typeof o.spacing === 'number' && o.spacing >= -2 && o.spacing <= 50)
  )
    throw bad(`${what}: letter spacing must be between -2 and 50 points`);
  if (
    o.comb !== undefined &&
    !(
      Number.isInteger(o.comb) &&
      (o.comb as number) >= 1 &&
      (o.comb as number) <= 100
    )
  )
    throw bad(`${what}: character boxes must be between 1 and 100`);
  return {
    id: str(o.id, what),
    pageId: str(o.pageId, what),
    rect: box(o.rect, what),
    kind: oneOf(o.kind, ['text', 'tick', 'cross', 'date'] as const, what),
    value: o.value,
    ...(fieldId ? { fieldId } : {}),
    ...(label ? { label } : {}),
    ...(o.size !== undefined ? { size: o.size as number } : {}),
    ...(o.multiline === true ? { multiline: true } : {}),
    ...(o.color !== undefined ? { color: o.color as string } : {}),
    ...(o.spacing !== undefined ? { spacing: o.spacing as number } : {}),
    ...(o.comb !== undefined ? { comb: o.comb as number } : {}),
    ...(o.restyle === true ? { restyle: true as const } : {}),
  };
}

export function detectCorrectParams(p: unknown): DetectCorrectParams {
  const what = 'Correct detection';
  const o = asRecord(p, what);
  const action = oneOf(o.action, ACTIONS, what);
  if (
    !Array.isArray(o.fieldIds) ||
    !o.fieldIds.every((x) => typeof x === 'string' && x)
  )
    throw bad(`${what}: expected field ids`);
  const out: DetectCorrectParams = { action, fieldIds: o.fieldIds as string[] };
  if (o.field !== undefined) out.field = detectedField(o.field, what);
  if (o.pageId !== undefined) out.pageId = str(o.pageId, what);
  if (o.rect !== undefined) out.rect = box(o.rect, what);
  if (o.type !== undefined) out.type = oneOf(o.type, FIELD_TYPES, what);
  if (o.parts !== undefined) {
    if (!Array.isArray(o.parts)) throw bad(`${what}: expected fields`);
    out.parts = o.parts.map((x) => detectedField(x, what));
  }
  const need = (ok: boolean) => {
    if (!ok) throw bad(`${what}: missing details for ${action}`);
  };
  if (action === 'add') need(!!out.field && !!out.pageId);
  else need(out.fieldIds.length > 0);
  if (action === 'resize') need(!!out.rect);
  if (action === 'retype') need(!!out.type);
  if (action === 'split' || action === 'merge')
    need(!!out.parts && out.parts.length > 0);
  return out;
}

export function makeFillableParams(p: unknown): {
  fields: MakeFillableField[];
} {
  const what = 'Make fillable';
  const o = asRecord(p, what);
  if (!Array.isArray(o.fields) || o.fields.length === 0)
    throw bad('There are no accepted fields to make fillable');
  return {
    fields: o.fields.map((f) => {
      const r = asRecord(f, what);
      const label = r.label === null ? null : optStr(r.label, what);
      const value = optStr(r.value, what);
      return {
        pageId: str(r.pageId, what),
        rect: box(r.rect, what),
        type: oneOf(r.type, FIELD_TYPES, what),
        label: label ?? null,
        ...(value !== undefined ? { value } : {}),
      };
    }),
  };
}
