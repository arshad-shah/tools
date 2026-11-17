import type { ObjectDef, Slot, TypeRef } from '../model';
import { pascalCase, quote } from '../naming';
import { blocks, nameFields, type Emitter } from './shared';

/** A C# property name: PascalCase. */
export const csharpIdent = (key: string) => pascalCase(key, 'Field');

export function csharpType(t: TypeRef): string {
  switch (t.kind) {
    case 'string':
      return t.format === 'date-time'
        ? 'DateTimeOffset'
        : t.format === 'date'
          ? 'DateOnly'
          : 'string';
    case 'integer':
      return 'long';
    case 'number':
      return 'double';
    case 'boolean':
      return 'bool';
    case 'object':
      return t.name;
    case 'array':
      return `List<${csharpSlot(t.items)}>`;
    case 'null':
    case 'unknown':
    case 'union':
      return 'JsonElement';
  }
}

const csharpSlot = (s: Slot) =>
  s.nullable || s.type.kind === 'null'
    ? `${csharpType(s.type)}?`
    : csharpType(s.type);

function record(def: ObjectDef): string {
  if (def.fields.length === 0)
    return `public record ${def.name}\n{\n    [JsonExtensionData]\n    public Dictionary<string, JsonElement> Values { get; init; } = new();\n}`;
  // A member may not share its enclosing type's name.
  const fields = nameFields(
    def,
    (k) => {
      const id = csharpIdent(k);
      return id === def.name ? `${id}Value` : id;
    },
    [def.name],
  );
  const props = fields.map((f) => {
    const nullable = f.nullable || f.optional || f.type.kind === 'null';
    const type = `${csharpType(f.type)}${nullable ? '?' : ''}`;
    return `    [JsonPropertyName(${quote(f.key)})]\n    public ${f.optional ? '' : 'required '}${type} ${f.ident} { get; init; }`;
  });
  return `public record ${def.name}\n{\n${props.join('\n\n')}\n}`;
}

/** Using directives do not see each other: an alias spells types in full. */
const qualify = (type: string) =>
  type
    .replace(/\bList</g, 'System.Collections.Generic.List<')
    .replace(/\b(DateTimeOffset|DateOnly)\b/g, 'System.$1')
    .replace(/\bJsonElement\b/g, 'System.Text.Json.JsonElement');

/** C# records for System.Text.Json (a root alias needs C# 12). */
export const emitCSharp: Emitter = (model) => {
  const rootIsObject =
    model.root.type.kind === 'object' && !model.root.nullable;
  const records = model.objects.map(record);
  const text = records.join('\n');
  const rootAlias = rootIsObject
    ? ''
    : `using ${model.rootName} = ${qualify(csharpType(model.root.type))};`;
  const usings = [
    /\b(DateTimeOffset|DateOnly)\b/.test(text) ? 'using System;' : '',
    /\b(List|Dictionary)</.test(text)
      ? 'using System.Collections.Generic;'
      : '',
    /\bJsonElement\b/.test(text) ? 'using System.Text.Json;' : '',
    'using System.Text.Json.Serialization;',
  ].filter(Boolean);
  return blocks([
    [...usings, rootAlias].filter(Boolean).join('\n'),
    ...records,
  ]);
};
