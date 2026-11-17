/**
 * The language-neutral type model the inference builds and every emitter
 * reads. Objects are named and listed once; identical shapes share a name.
 */

export type DateFormat = 'date-time' | 'date';

export type TypeRef =
  | { kind: 'string'; format?: DateFormat }
  | { kind: 'integer' }
  | { kind: 'number' }
  | { kind: 'boolean' }
  /** Only ever null in the samples. */
  | { kind: 'null' }
  /** Nothing known: the items of an empty array. */
  | { kind: 'unknown' }
  | { kind: 'array'; items: Slot }
  | { kind: 'object'; name: string }
  /** Two or more non-null members, no two of the same kind. */
  | { kind: 'union'; members: TypeRef[] };

/** A type that may also be null. */
export interface Slot {
  type: TypeRef;
  nullable: boolean;
}

export interface FieldDef {
  /** The JSON key, exactly as in the samples. */
  key: string;
  type: TypeRef;
  /** Null in some samples. */
  nullable: boolean;
  /** Missing from some samples. */
  optional: boolean;
}

export interface ObjectDef {
  /** Unique PascalCase name. */
  name: string;
  fields: FieldDef[];
}

export interface TypeModel {
  /** Name of the root type (the option). */
  rootName: string;
  root: Slot;
  /** Named objects, root first then in the order they were found. */
  objects: ObjectDef[];
}

/** The object definitions with every dependency before its user (Zod, Python). */
export function dependencyOrder(model: TypeModel): ObjectDef[] {
  const byName = new Map(model.objects.map((o) => [o.name, o]));
  const done = new Set<string>();
  const out: ObjectDef[] = [];
  const visitType = (t: TypeRef): void => {
    if (t.kind === 'object') visit(t.name);
    else if (t.kind === 'array') visitType(t.items.type);
    else if (t.kind === 'union') t.members.forEach(visitType);
  };
  const visit = (name: string): void => {
    if (done.has(name)) return;
    done.add(name);
    const def = byName.get(name);
    if (!def) return;
    for (const f of def.fields) visitType(f.type);
    out.push(def);
  };
  for (const o of model.objects) visit(o.name);
  return out;
}

/** Whether a type mentions a date-format string anywhere (imports). */
export function usesFormat(model: TypeModel, format: DateFormat): boolean {
  const hit = (t: TypeRef): boolean =>
    t.kind === 'string'
      ? t.format === format
      : t.kind === 'array'
        ? hit(t.items.type)
        : t.kind === 'union'
          ? t.members.some(hit)
          : false;
  return (
    hit(model.root.type) ||
    model.objects.some((o) => o.fields.some((f) => hit(f.type)))
  );
}

/** Whether a type is a union, null or unknown anywhere (dynamic value types). */
export function usesDynamic(model: TypeModel): boolean {
  const hit = (t: TypeRef): boolean =>
    t.kind === 'union' ||
    t.kind === 'unknown' ||
    t.kind === 'null' ||
    (t.kind === 'array' && hit(t.items.type));
  return (
    hit(model.root.type) ||
    model.objects.some((o) => o.fields.some((f) => hit(f.type)))
  );
}
