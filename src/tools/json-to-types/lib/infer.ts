import type {
  DateFormat,
  FieldDef,
  ObjectDef,
  Slot,
  TypeModel,
  TypeRef,
} from './model';
import { itemName, NameScope, pascalCase } from './naming';

/**
 * Type inference from sample values. Every sample is merged into one shape:
 * object keys are unioned (a key missing from some samples is optional, a
 * key that is null in some is nullable), array items are merged across all
 * elements, integers widen to numbers, and anything else mixed becomes a
 * union. Nested objects are named from their keys; identical shapes share
 * one name and different shapes with the same name are numbered.
 */

export interface InferOptions {
  /** Name of the root type. */
  rootName: string;
  /** Strings that are all ISO dates or date-times get a date format. */
  detectDates: boolean;
}

interface Shape {
  seen: number;
  nulls: number;
  integers: number;
  floats: number;
  booleans: number;
  strings: number;
  dateTimes: number;
  dates: number;
  object: ObjectShape | null;
  /** Items shape; its `seen` is 0 when every array was empty. */
  array: Shape | null;
}

interface ObjectShape {
  seen: number;
  fields: Map<string, Shape>;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;

const validDate = (m: RegExpExecArray | null) => {
  if (!m) return false;
  const month = Number(m[2]);
  const day = Number(m[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
};

/** Which date format a string has, if any (RFC 3339 full-date or date-time). */
export function dateFormatOf(s: string): DateFormat | null {
  if (s.length === 10 && validDate(DATE.exec(s))) return 'date';
  const m = DATE_TIME.exec(s);
  if (validDate(m) && m && Number(m[4]) < 24 && Number(m[5]) < 60)
    return 'date-time';
  return null;
}

const emptyShape = (): Shape => ({
  seen: 0,
  nulls: 0,
  integers: 0,
  floats: 0,
  booleans: 0,
  strings: 0,
  dateTimes: 0,
  dates: 0,
  object: null,
  array: null,
});

function merge(shape: Shape, v: unknown): void {
  shape.seen++;
  if (v === null || v === undefined) shape.nulls++;
  else if (typeof v === 'string') {
    shape.strings++;
    const f = dateFormatOf(v);
    if (f === 'date') shape.dates++;
    else if (f === 'date-time') shape.dateTimes++;
  } else if (typeof v === 'number') {
    if (Number.isInteger(v)) shape.integers++;
    else shape.floats++;
  } else if (typeof v === 'boolean') shape.booleans++;
  else if (Array.isArray(v)) {
    shape.array ??= emptyShape();
    for (const item of v) merge(shape.array, item);
  } else if (typeof v === 'object') {
    shape.object ??= { seen: 0, fields: new Map() };
    shape.object.seen++;
    for (const [k, fv] of Object.entries(v as Record<string, unknown>)) {
      let f = shape.object.fields.get(k);
      if (!f) shape.object.fields.set(k, (f = emptyShape()));
      merge(f, fv);
    }
  }
}

/* An intermediate tree: types with unnamed objects and their signatures. */
type Draft =
  | {
      kind: 'leaf';
      type: Exclude<TypeRef, { kind: 'array' | 'object' | 'union' }>;
    }
  | { kind: 'array'; items: DraftSlot }
  | { kind: 'object'; obj: DraftObject }
  | { kind: 'union'; members: Draft[] };

interface DraftSlot {
  draft: Draft;
  nullable: boolean;
}

interface DraftObject {
  sig: string;
  fields: { key: string; slot: DraftSlot; optional: boolean }[];
}

function sigOf(d: Draft): string {
  switch (d.kind) {
    case 'leaf':
      return d.type.kind === 'string' && d.type.format
        ? `string:${d.type.format}`
        : d.type.kind;
    case 'array':
      return `[${sigOf(d.items.draft)}${d.items.nullable ? '?' : ''}]`;
    case 'object':
      return d.obj.sig;
    case 'union':
      return `(${d.members.map(sigOf).join('|')})`;
  }
}

function draftShape(shape: Shape, detectDates: boolean): DraftSlot {
  const members: Draft[] = [];
  if (shape.object) {
    const fields = [...shape.object.fields].map(([key, f]) => ({
      key,
      slot: draftShape(f, detectDates),
      optional: f.seen < (shape.object as ObjectShape).seen,
    }));
    const sig = `{${fields
      .map(
        (f) =>
          `${JSON.stringify(f.key)}${f.optional ? '?' : ''}:${sigOf(f.slot.draft)}${f.slot.nullable ? '|null' : ''}`,
      )
      .sort()
      .join(',')}}`;
    members.push({ kind: 'object', obj: { sig, fields } });
  }
  if (shape.array) {
    members.push({
      kind: 'array',
      items:
        shape.array.seen === 0
          ? {
              draft: { kind: 'leaf', type: { kind: 'unknown' } },
              nullable: false,
            }
          : draftShape(shape.array, detectDates),
    });
  }
  if (shape.strings) {
    const format: DateFormat | undefined = !detectDates
      ? undefined
      : shape.dates === shape.strings
        ? 'date'
        : shape.dateTimes === shape.strings
          ? 'date-time'
          : undefined;
    members.push({
      kind: 'leaf',
      type: format ? { kind: 'string', format } : { kind: 'string' },
    });
  }
  if (shape.floats) members.push({ kind: 'leaf', type: { kind: 'number' } });
  else if (shape.integers)
    members.push({ kind: 'leaf', type: { kind: 'integer' } });
  if (shape.booleans) members.push({ kind: 'leaf', type: { kind: 'boolean' } });

  const nullable = shape.nulls > 0;
  if (members.length === 0)
    return {
      draft: {
        kind: 'leaf',
        type: nullable ? { kind: 'null' } : { kind: 'unknown' },
      },
      nullable: false,
    };
  return {
    draft: members.length === 1 ? members[0] : { kind: 'union', members },
    nullable,
  };
}

/** Infers the type model of `samples` (each one a value of the root type). */
export function inferModel(samples: unknown[], opts: InferOptions): TypeModel {
  const shape = emptyShape();
  for (const s of samples) merge(shape, s);
  const root =
    shape.seen === 0
      ? {
          draft: { kind: 'leaf', type: { kind: 'unknown' } } as Draft,
          nullable: false,
        }
      : draftShape(shape, opts.detectDates);

  const rootName = pascalCase(opts.rootName.trim() || 'Root', 'Root');
  const scope = new NameScope();
  const bySig = new Map<string, string>();
  const objects: ObjectDef[] = [];
  // A root that is not a plain object is an alias with the root name.
  const plain = root.draft.kind === 'object' && !root.nullable;
  if (!plain) scope.take(rootName);
  const rootHint =
    plain || root.draft.kind === 'array' ? rootName : `${rootName}Value`;

  const name = (d: Draft, hint: string): TypeRef => {
    switch (d.kind) {
      case 'leaf':
        return d.type;
      case 'array':
        return {
          kind: 'array',
          items: {
            type: name(d.items.draft, itemName(hint)),
            nullable: d.items.nullable,
          },
        };
      case 'union':
        return { kind: 'union', members: d.members.map((m) => name(m, hint)) };
      case 'object': {
        const known = bySig.get(d.obj.sig);
        if (known) return { kind: 'object', name: known };
        const def: ObjectDef = { name: scope.take(hint), fields: [] };
        bySig.set(d.obj.sig, def.name);
        objects.push(def);
        def.fields = d.obj.fields.map(
          (f): FieldDef => ({
            key: f.key,
            type: name(f.slot.draft, pascalCase(f.key)),
            nullable: f.slot.nullable,
            optional: f.optional,
          }),
        );
        return { kind: 'object', name: def.name };
      }
    }
  };

  const rootSlot: Slot = {
    type: name(root.draft, rootHint),
    nullable: root.nullable,
  };
  return { rootName, root: rootSlot, objects };
}
