import {
  dependencyOrder,
  usesFormat,
  type ObjectDef,
  type Slot,
  type TypeModel,
  type TypeRef,
} from '../model';
import { quote, snakeCase } from '../naming';
import { blocks, nameFields, type Emitter } from './shared';

export const PY_KEYWORDS = new Set(
  (
    'False None True and as assert async await break class continue def ' +
    'del elif else except finally for from global if import in is lambda ' +
    'nonlocal not or pass raise return try while with yield'
  ).split(' '),
);

/** Whether a key can be a Python attribute as it is. */
export const isPyIdent = (s: string) =>
  /^[A-Za-z_][A-Za-z0-9_]*$/.test(s) && !PY_KEYWORDS.has(s);

/** A Python attribute name for a key: kept when valid, else snake_case. */
export function pyIdent(key: string): string {
  if (isPyIdent(key)) return key;
  const name = snakeCase(key);
  return PY_KEYWORDS.has(name) ? `${name}_` : name;
}

export function pyType(t: TypeRef): string {
  switch (t.kind) {
    case 'string':
      return t.format === 'date-time'
        ? 'datetime'
        : t.format === 'date'
          ? 'date'
          : 'str';
    case 'integer':
      return 'int';
    case 'number':
      return 'float';
    case 'boolean':
      return 'bool';
    case 'null':
      return 'None';
    case 'unknown':
      return 'Any';
    case 'object':
      return t.name;
    case 'union':
      return t.members.map(pyType).join(' | ');
    case 'array':
      return `list[${pySlot(t.items)}]`;
  }
}

const pySlot = (s: Slot) =>
  s.nullable && s.type.kind !== 'null' && s.type.kind !== 'unknown'
    ? `${pyType(s.type)} | None`
    : pyType(s.type);

const fieldSlot = (f: {
  type: TypeRef;
  nullable: boolean;
  optional: boolean;
}) => pySlot({ type: f.type, nullable: f.nullable || f.optional });

function dataclass(def: ObjectDef): string {
  if (def.fields.length === 0) return `${def.name} = dict[str, Any]`;
  const fields = nameFields(def, pyIdent, PY_KEYWORDS);
  // Fields with a default must follow those without.
  const ordered = [
    ...fields.filter((f) => !f.optional),
    ...fields.filter((f) => f.optional),
  ];
  const lines = ordered.map((f) => {
    const renamed = f.ident !== f.key;
    const meta = `metadata={"json": ${quote(f.key)}}`;
    const value = f.optional
      ? renamed
        ? ` = field(default=None, ${meta})`
        : ' = None'
      : renamed
        ? ` = field(${meta})`
        : '';
    return `    ${f.ident}: ${fieldSlot(f)}${value}`;
  });
  return `@dataclass\nclass ${def.name}:\n${lines.join('\n')}`;
}

const tdSlot = (f: { type: TypeRef; nullable: boolean; optional: boolean }) => {
  const t = pySlot({ type: f.type, nullable: f.nullable });
  return f.optional ? `NotRequired[${t}]` : t;
};

function typedDict(def: ObjectDef): string {
  if (def.fields.length === 0) return `${def.name} = dict[str, Any]`;
  if (def.fields.every((f) => isPyIdent(f.key)))
    return `class ${def.name}(TypedDict):\n${def.fields
      .map((f) => `    ${f.key}: ${tdSlot(f)}`)
      .join('\n')}`;
  // Keys that are not identifiers need the functional form.
  return `${def.name} = TypedDict(\n    ${quote(def.name)},\n    {\n${def.fields
    .map((f) => `        ${quote(f.key)}: ${tdSlot(f)},`)
    .join('\n')}\n    },\n)`;
}

/** The import lines the emitted `body` needs. */
function imports(
  body: string,
  model: TypeModel,
  style: 'dataclass' | 'typeddict',
): string {
  const has = (word: string) => new RegExp(`\\b${word}\\b`).test(body);
  const lines = ['from __future__ import annotations', ''];
  if (style === 'dataclass' && /^@dataclass$/m.test(body))
    lines.push(
      `from dataclasses import dataclass${/= field\(/.test(body) ? ', field' : ''}`,
    );
  const dates = (['date', 'date-time'] as const)
    .filter((f) => usesFormat(model, f))
    .map((f) => (f === 'date' ? 'date' : 'datetime'));
  if (dates.length) lines.push(`from datetime import ${dates.join(', ')}`);
  const typing = ['Any', 'NotRequired', 'TypedDict'].filter(has);
  if (typing.length) lines.push(`from typing import ${typing.join(', ')}`);
  return lines.length === 2 ? lines[0] : lines.join('\n');
}

/** Python dataclasses or TypedDicts, each after the classes it uses. */
export const emitPython: Emitter = (model, opts) => {
  const rootIsObject =
    model.root.type.kind === 'object' && !model.root.nullable;
  const make = opts.pythonStyle === 'typeddict' ? typedDict : dataclass;
  const body = blocks([
    ...dependencyOrder(model).map((o) => `\n${make(o)}`),
    rootIsObject ? null : `\n${model.rootName} = ${pySlot(model.root)}`,
  ]);
  return `${imports(body, model, opts.pythonStyle)}\n\n${body}`;
};
