import type { FieldDef, ObjectDef, TypeModel } from '../model';
import { NameScope } from '../naming';

/** Emitter options; each emitter reads the ones for its language. */
export interface EmitOptions {
  /** TypeScript: `interface` or `type` declarations. */
  tsDeclaration: 'interface' | 'type';
  /** Python: dataclasses or TypedDicts. */
  pythonStyle: 'dataclass' | 'typeddict';
}

export const DEFAULT_EMIT: EmitOptions = {
  tsDeclaration: 'interface',
  pythonStyle: 'dataclass',
};

export type Emitter = (model: TypeModel, opts: EmitOptions) => string;

/** A field with the identifier a language gives it. */
export interface NamedField extends FieldDef {
  ident: string;
}

/**
 * Identifiers for an object's fields, unique within the object: `toIdent`
 * proposes one from the key, clashes are numbered.
 */
export function nameFields(
  def: ObjectDef,
  toIdent: (key: string) => string,
  reserved: Iterable<string> = [],
): NamedField[] {
  const scope = new NameScope(reserved);
  return def.fields.map((f) => ({ ...f, ident: scope.take(toIdent(f.key)) }));
}

/** Pads `cells` rows into aligned columns (gofmt style), joined by a space. */
export function align(rows: string[][]): string[] {
  const widths: number[] = [];
  for (const r of rows)
    r.forEach((c, i) => {
      if (i < r.length - 1) widths[i] = Math.max(widths[i] ?? 0, c.length);
    });
  return rows.map((r) =>
    r.map((c, i) => (i < r.length - 1 ? c.padEnd(widths[i]) : c)).join(' '),
  );
}

/** Joins blocks with one blank line and ends with a newline. */
export const blocks = (parts: (string | null | false)[]) =>
  `${parts.filter((p): p is string => !!p).join('\n\n')}\n`;
