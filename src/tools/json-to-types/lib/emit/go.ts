import { usesFormat, type ObjectDef, type Slot, type TypeRef } from '../model';
import { pascalCase, quote, words } from '../naming';
import { align, blocks, nameFields, type Emitter } from './shared';

/** Common initialisms Go style writes in capitals (golint's list, trimmed). */
const INITIALISMS = new Set([
  'ACL',
  'API',
  'ASCII',
  'CPU',
  'CSS',
  'DNS',
  'EOF',
  'GUID',
  'HTML',
  'HTTP',
  'HTTPS',
  'ID',
  'IP',
  'JSON',
  'LHS',
  'QPS',
  'RAM',
  'RHS',
  'RPC',
  'SLA',
  'SMTP',
  'SQL',
  'SSH',
  'TCP',
  'TLS',
  'TTL',
  'UDP',
  'UI',
  'UID',
  'UUID',
  'URI',
  'URL',
  'UTF8',
  'VM',
  'XML',
  'XMPP',
  'XSRF',
  'XSS',
]);

/** An exported Go identifier: `user_id` to `UserID`. */
export function goIdent(key: string): string {
  const ws = words(key);
  if (!ws.length) return 'Field';
  const name = ws
    .map((w) =>
      INITIALISMS.has(w.toUpperCase())
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join('');
  return /^[0-9]/.test(name) ? `Field${name}` : name;
}

/** A Go type; `pointer` makes scalars and structs nilable. */
export function goType(t: TypeRef, pointer = false): string {
  const p = pointer ? '*' : '';
  switch (t.kind) {
    case 'string':
      return `${p}${t.format === 'date-time' ? 'time.Time' : 'string'}`;
    case 'integer':
      return `${p}int64`;
    case 'number':
      return `${p}float64`;
    case 'boolean':
      return `${p}bool`;
    case 'object':
      return `${p}${t.name}`;
    case 'array':
      return `[]${goSlot(t.items)}`;
    case 'null':
    case 'unknown':
    case 'union':
      return 'any';
  }
}

const goSlot = (s: Slot) => goType(s.type, s.nullable);

function goStruct(def: ObjectDef): string {
  if (def.fields.length === 0) return `type ${def.name} map[string]any`;
  const fields = nameFields(def, goIdent);
  const rows = fields.map((f) => [
    `\t${f.ident}`,
    goType(f.type, f.nullable || f.optional),
    `\`json:${quote(`${f.key}${f.optional ? ',omitempty' : ''}`)}\``,
  ]);
  return `type ${def.name} struct {\n${align(rows).join('\n')}\n}`;
}

/** Go structs with json tags (`encoding/json`). */
export const emitGo: Emitter = (model) => {
  const rootIsObject =
    model.root.type.kind === 'object' && !model.root.nullable;
  return blocks([
    'package main',
    usesFormat(model, 'date-time') ? 'import "time"' : null,
    rootIsObject
      ? null
      : `type ${pascalCase(model.rootName)} ${goSlot(model.root)}`,
    ...model.objects.map(goStruct),
  ]);
};
