import type { ObjectDef, Slot, TypeRef } from '../model';
import { quote, snakeCase } from '../naming';
import { blocks, nameFields, type Emitter } from './shared';

const KEYWORDS = new Set(
  (
    'as async await break const continue dyn else enum extern false fn for ' +
    'if impl in let loop match mod move mut pub ref return static struct ' +
    'trait true type unsafe use where while abstract become box do final ' +
    'macro override priv try typeof unsized virtual yield'
  ).split(' '),
);
/** Keywords that cannot be raw identifiers. */
const NOT_RAW = new Set(['crate', 'self', 'super', 'Self']);

/** A Rust field name for a key, and whether serde needs a rename. */
export function rustIdent(key: string): string {
  const name = snakeCase(key);
  if (NOT_RAW.has(name)) return `${name}_`;
  return KEYWORDS.has(name) ? `r#${name}` : name;
}

/** Serde maps `r#type` to "type" by itself. */
const serdeName = (ident: string) =>
  ident.startsWith('r#') ? ident.slice(2) : ident;

export function rustType(t: TypeRef): string {
  switch (t.kind) {
    case 'string':
      return 'String';
    case 'integer':
      return 'i64';
    case 'number':
      return 'f64';
    case 'boolean':
      return 'bool';
    case 'object':
      return t.name;
    case 'array':
      return `Vec<${rustSlot(t.items)}>`;
    case 'null':
    case 'unknown':
    case 'union':
      return 'serde_json::Value';
  }
}

const dynamic = (t: TypeRef) =>
  t.kind === 'null' || t.kind === 'unknown' || t.kind === 'union';

const rustSlot = (s: Slot) =>
  s.nullable && !dynamic(s.type)
    ? `Option<${rustType(s.type)}>`
    : rustType(s.type);

const DERIVE = '#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]';

function rustStruct(def: ObjectDef): string {
  if (def.fields.length === 0)
    return `pub type ${def.name} = serde_json::Map<String, serde_json::Value>;`;
  const lines = nameFields(def, rustIdent).flatMap((f) => {
    const attrs: string[] = [];
    if (serdeName(f.ident) !== f.key) attrs.push(`rename = ${quote(f.key)}`);
    const option = (f.nullable || f.optional) && !dynamic(f.type);
    if (f.optional)
      attrs.push(
        option ? 'default, skip_serializing_if = "Option::is_none"' : 'default',
      );
    const type = option ? `Option<${rustType(f.type)}>` : rustType(f.type);
    const comment =
      f.type.kind === 'string' && f.type.format
        ? [
            `    /// ${f.type.format === 'date' ? 'Date' : 'Date-time'} (RFC 3339).`,
          ]
        : [];
    return [
      ...comment,
      ...(attrs.length ? [`    #[serde(${attrs.join(', ')})]`] : []),
      `    pub ${f.ident}: ${type},`,
    ];
  });
  return `${DERIVE}\npub struct ${def.name} {\n${lines.join('\n')}\n}`;
}

/** Rust structs for serde (`serde` with `derive`, and `serde_json`). */
export const emitRust: Emitter = (model) => {
  const rootIsObject =
    model.root.type.kind === 'object' && !model.root.nullable;
  return blocks([
    'use serde::{Deserialize, Serialize};',
    rootIsObject
      ? null
      : `pub type ${model.rootName} = ${rustSlot(model.root)};`,
    ...model.objects.map(rustStruct),
  ]);
};
