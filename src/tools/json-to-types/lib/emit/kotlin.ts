import type { ObjectDef, Slot, TypeRef } from '../model';
import { camelCase, quote } from '../naming';
import { blocks, nameFields, type Emitter } from './shared';

const KEYWORDS = new Set(
  (
    'as break class continue do else false for fun if in interface is null ' +
    'object package return super this throw true try typealias typeof val ' +
    'var when while'
  ).split(' '),
);

/** A Kotlin property name: camelCase, back-quoted when a keyword. */
export function kotlinIdent(key: string): string {
  const name = camelCase(key);
  return KEYWORDS.has(name) ? `\`${name}\`` : name;
}

export function kotlinType(t: TypeRef): string {
  switch (t.kind) {
    case 'string':
      return 'String';
    case 'integer':
      return 'Long';
    case 'number':
      return 'Double';
    case 'boolean':
      return 'Boolean';
    case 'object':
      return t.name;
    case 'array':
      return `List<${kotlinSlot(t.items)}>`;
    case 'null':
    case 'unknown':
    case 'union':
      return 'JsonElement';
  }
}

const kotlinSlot = (s: Slot) =>
  s.nullable || s.type.kind === 'null'
    ? `${kotlinType(s.type)}?`
    : kotlinType(s.type);

function dataClass(def: ObjectDef): string {
  if (def.fields.length === 0) return `typealias ${def.name} = JsonObject`;
  const params = nameFields(def, kotlinIdent).flatMap((f) => {
    const nullable = f.nullable || f.optional || f.type.kind === 'null';
    const type = `${kotlinType(f.type)}${nullable ? '?' : ''}`;
    const plain = f.ident.replace(/`/g, '');
    return [
      ...(plain !== f.key ? [`    @SerialName(${quote(f.key)})`] : []),
      `    val ${f.ident}: ${type}${f.optional ? ' = null' : ''},`,
    ];
  });
  return `@Serializable\ndata class ${def.name}(\n${params.join('\n')}\n)`;
}

/** Kotlin data classes for kotlinx.serialization. */
export const emitKotlin: Emitter = (model) => {
  const rootIsObject =
    model.root.type.kind === 'object' && !model.root.nullable;
  const body = [
    rootIsObject
      ? null
      : `typealias ${model.rootName} = ${kotlinSlot(model.root)}`,
    ...model.objects.map(dataClass),
  ].filter((b): b is string => !!b);
  const text = body.join('\n\n');
  const imports = [
    /@SerialName\(/.test(text) ? 'import kotlinx.serialization.SerialName' : '',
    /@Serializable/.test(text)
      ? 'import kotlinx.serialization.Serializable'
      : '',
    /\bJsonElement\b/.test(text)
      ? 'import kotlinx.serialization.json.JsonElement'
      : '',
    /\bJsonObject\b/.test(text)
      ? 'import kotlinx.serialization.json.JsonObject'
      : '',
  ].filter(Boolean);
  return blocks([imports.length ? imports.join('\n') : null, ...body]);
};
