import type { ObjectDef, Slot, TypeModel, TypeRef } from '../model';
import type { Emitter } from './shared';

type Schema = { [key: string]: unknown };

export const SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema';

const PRIMITIVE = new Set(['string', 'integer', 'number', 'boolean', 'null']);

/** Whether a schema is only `{ type: <name> }`. */
const plainType = (s: Schema) =>
  Object.keys(s).length === 1 && typeof s.type === 'string';

function schemaOf(t: TypeRef, refOf: (name: string) => string): Schema {
  switch (t.kind) {
    case 'string':
      return t.format
        ? { type: 'string', format: t.format }
        : { type: 'string' };
    case 'integer':
    case 'number':
    case 'boolean':
    case 'null':
      return { type: t.kind };
    case 'unknown':
      return {};
    case 'object':
      return { $ref: refOf(t.name) };
    case 'array':
      return { type: 'array', items: slotSchema(t.items, refOf) };
    case 'union': {
      const members = t.members.map((m) => schemaOf(m, refOf));
      return members.every(plainType)
        ? { type: members.map((m) => m.type) }
        : { anyOf: members };
    }
  }
}

function slotSchema(s: Slot, refOf: (name: string) => string): Schema {
  const schema = schemaOf(s.type, refOf);
  if (!s.nullable || s.type.kind === 'null' || s.type.kind === 'unknown')
    return schema;
  if (plainType(schema)) return { type: [schema.type, 'null'] };
  if (Array.isArray(schema.type) && Object.keys(schema).length === 1)
    return { type: [...(schema.type as string[]), 'null'] };
  if (Array.isArray(schema.anyOf))
    return { anyOf: [...(schema.anyOf as Schema[]), { type: 'null' }] };
  if (typeof schema.type === 'string' && PRIMITIVE.has(schema.type))
    return { ...schema, type: [schema.type, 'null'] };
  return { anyOf: [schema, { type: 'null' }] };
}

function objectSchema(def: ObjectDef, refOf: (name: string) => string): Schema {
  if (def.fields.length === 0) return { type: 'object' };
  const properties: Schema = {};
  for (const f of def.fields)
    properties[f.key] = slotSchema(
      { type: f.type, nullable: f.nullable },
      refOf,
    );
  const required = def.fields.filter((f) => !f.optional).map((f) => f.key);
  return {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
  };
}

/** The JSON Schema (draft 2020-12) document as a value. */
export function jsonSchema(model: TypeModel): Schema {
  const rootDef =
    model.root.type.kind === 'object' && !model.root.nullable
      ? model.objects.find(
          (o) =>
            model.root.type.kind === 'object' &&
            o.name === model.root.type.name,
        )
      : undefined;
  const refOf = (name: string) =>
    rootDef && name === rootDef.name ? '#' : `#/$defs/${name}`;
  const body = rootDef
    ? objectSchema(rootDef, refOf)
    : slotSchema(model.root, refOf);
  const defs: Schema = {};
  for (const o of model.objects)
    if (o !== rootDef) defs[o.name] = objectSchema(o, refOf);
  return {
    $schema: SCHEMA_DIALECT,
    title: model.rootName,
    ...body,
    ...(Object.keys(defs).length ? { $defs: defs } : {}),
  };
}

export const emitJsonSchema: Emitter = (model) =>
  `${JSON.stringify(jsonSchema(model), null, 2)}\n`;
