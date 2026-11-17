import {
  dependencyOrder,
  type ObjectDef,
  type Slot,
  type TypeRef,
} from '../model';
import { blocks, type Emitter } from './shared';
import { tsKey } from './typescript';

const schemaName = (name: string) => `${name}Schema`;

/** A Zod schema expression. */
export function zodType(t: TypeRef): string {
  switch (t.kind) {
    case 'string':
      return t.format === 'date-time'
        ? 'z.string().datetime({ offset: true })'
        : t.format === 'date'
          ? 'z.string().date()'
          : 'z.string()';
    case 'integer':
      return 'z.number().int()';
    case 'number':
      return 'z.number()';
    case 'boolean':
      return 'z.boolean()';
    case 'null':
      return 'z.null()';
    case 'unknown':
      return 'z.unknown()';
    case 'object':
      return schemaName(t.name);
    case 'union':
      return `z.union([${t.members.map(zodType).join(', ')}])`;
    case 'array':
      return `z.array(${zodSlot(t.items)})`;
  }
}

const zodSlot = (s: Slot) =>
  s.nullable && s.type.kind !== 'null' && s.type.kind !== 'unknown'
    ? `${zodType(s.type)}.nullable()`
    : zodType(s.type);

function zodObject(def: ObjectDef): string {
  const schema =
    def.fields.length === 0
      ? 'z.record(z.string(), z.unknown())'
      : `z.object({\n${def.fields
          .map(
            (f) =>
              `  ${tsKey(f.key)}: ${zodSlot({ type: f.type, nullable: f.nullable })}${f.optional ? '.optional()' : ''},`,
          )
          .join('\n')}\n})`;
  return `export const ${schemaName(def.name)} = ${schema};\nexport type ${def.name} = z.infer<typeof ${schemaName(def.name)}>;`;
}

/** Zod schemas with inferred types, each after the schemas it uses. */
export const emitZod: Emitter = (model) => {
  const rootIsObject =
    model.root.type.kind === 'object' &&
    model.root.type.name === model.rootName &&
    !model.root.nullable;
  const root = schemaName(model.rootName);
  return blocks([
    "import { z } from 'zod';",
    ...dependencyOrder(model).map(zodObject),
    rootIsObject
      ? null
      : `export const ${root} = ${zodSlot(model.root)};\nexport type ${model.rootName} = z.infer<typeof ${root}>;`,
  ]);
};
