import { parseYaml } from '@/shared/lib/data-formats/yaml';
import { ToolError } from '@/shared/lib/errors';
import { isObj, type Obj } from './refs';

export type SpecKind = 'openapi3' | 'swagger2';

export interface LoadedSpec {
  doc: Obj;
  kind: SpecKind;
  /** The `openapi` or `swagger` field, e.g. "3.1.0". */
  version: string;
  format: 'json' | 'yaml';
}

const bad = (message: string, cause?: unknown) =>
  new ToolError('INVALID_INPUT', message, { cause });

/** The kind and version of a parsed document, or a ToolError saying why not. */
export function specKind(doc: unknown): { kind: SpecKind; version: string } {
  if (!isObj(doc))
    throw bad('This is not an OpenAPI document: it is not an object');
  const oa = doc.openapi;
  if (typeof oa === 'string' || typeof oa === 'number') {
    const version = String(oa);
    if (!/^3\./.test(version))
      throw bad(`OpenAPI ${version} is not supported: use 3.x or Swagger 2.0`);
    return { kind: 'openapi3', version };
  }
  const sw = doc.swagger;
  if (typeof sw === 'string' || typeof sw === 'number') {
    const version = String(sw);
    if (!/^2(\.0)?$/.test(version))
      throw bad(`Swagger ${version} is not supported: use 2.0 or OpenAPI 3.x`);
    return { kind: 'swagger2', version: '2.0' };
  }
  throw bad(
    'This is not an OpenAPI document: it has no "openapi" or "swagger" field',
  );
}

/** Parses an OpenAPI 3.x or Swagger 2.0 document written as JSON or YAML. */
export async function loadSpec(text: string): Promise<LoadedSpec> {
  const trimmed = text.trim();
  if (!trimmed) throw bad('Paste or open an OpenAPI document');
  let doc: unknown;
  let format: LoadedSpec['format'];
  if (trimmed.startsWith('{')) {
    format = 'json';
    try {
      doc = JSON.parse(trimmed);
    } catch (e) {
      throw bad(`Not valid JSON: ${(e as Error).message}`, e);
    }
  } else {
    format = 'yaml';
    doc = await parseYaml(trimmed);
  }
  const { kind, version } = specKind(doc);
  return { doc: doc as Obj, kind, version, format };
}
