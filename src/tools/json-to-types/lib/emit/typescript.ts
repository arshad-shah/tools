import type { ObjectDef, Slot, TypeRef } from '../model';
import { isJsIdentifier, quote } from '../naming';
import { blocks, type Emitter } from './shared';

/** A TypeScript type expression. */
export function tsType(t: TypeRef): string {
  switch (t.kind) {
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'unknown':
      return 'unknown';
    case 'object':
      return t.name;
    case 'union':
      return t.members.map(tsType).join(' | ');
    case 'array': {
      const inner = tsSlot(t.items);
      return /[| ]/.test(inner) ? `(${inner})[]` : `${inner}[]`;
    }
  }
}

const tsSlot = (s: Slot) =>
  s.nullable && s.type.kind !== 'null' && s.type.kind !== 'unknown'
    ? `${tsType(s.type)} | null`
    : tsType(s.type);

/** A property key: bare when it is an identifier, quoted otherwise. */
export const tsKey = (key: string) => (isJsIdentifier(key) ? key : quote(key));

function tsObject(def: ObjectDef, declaration: 'interface' | 'type'): string {
  if (def.fields.length === 0)
    return `export type ${def.name} = Record<string, unknown>;`;
  const body = def.fields
    .map(
      (f) =>
        `  ${tsKey(f.key)}${f.optional ? '?' : ''}: ${tsSlot({ type: f.type, nullable: f.nullable })};`,
    )
    .join('\n');
  return declaration === 'interface'
    ? `export interface ${def.name} {\n${body}\n}`
    : `export type ${def.name} = {\n${body}\n};`;
}

/** TypeScript interfaces (or type aliases), root first. */
export const emitTypeScript: Emitter = (model, opts) => {
  const rootIsObject =
    model.root.type.kind === 'object' &&
    model.root.type.name === model.rootName &&
    !model.root.nullable;
  return blocks([
    rootIsObject
      ? null
      : `export type ${model.rootName} = ${tsSlot(model.root)};`,
    ...model.objects.map((o) => tsObject(o, opts.tsDeclaration)),
  ]);
};
