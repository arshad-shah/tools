import type { LoadedSpec } from './load';
import { isObj, resolveObj, type Obj } from './refs';
import type {
  MediaContent,
  Param,
  RequestBody,
  SecurityScheme,
  Server,
  ServerVariable,
} from './types';

/** Reading the parts of a document `buildApi` puts together. */

export const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

/** The example of a media type: `example`, or the first `examples` value. */
function mediaExample(
  doc: Obj,
  media: Obj,
): { example?: unknown; has: boolean } {
  if ('example' in media) return { example: media.example, has: true };
  if (isObj(media.examples)) {
    const first = Object.values(media.examples)[0];
    if (first !== undefined) {
      const ex = resolveObj(doc, first);
      if ('value' in ex) return { example: ex.value, has: true };
    }
  }
  return { has: false };
}

export function contents(doc: Obj, content: unknown): MediaContent[] {
  if (!isObj(content)) return [];
  return Object.entries(content).map(([mediaType, m]) => {
    const media = resolveObj(doc, m);
    const ex = mediaExample(doc, media);
    return {
      mediaType,
      schema: media.schema,
      example: ex.example,
      hasExample: ex.has,
    };
  });
}

/** A Swagger 2.0 non-body parameter's type fields as a schema. */
export function swaggerParamSchema(p: Obj): Obj {
  const schema: Obj = {};
  for (const k of [
    'type',
    'format',
    'items',
    'enum',
    'default',
    'minimum',
    'maximum',
    'pattern',
  ])
    if (k in p) schema[k] = p[k];
  return schema;
}

export function servers(spec: LoadedSpec): Server[] {
  const { doc } = spec;
  if (spec.kind === 'swagger2') {
    const host = str(doc.host);
    const base = str(doc.basePath) ?? '';
    if (!host) return base ? [{ url: base, variables: {} }] : [];
    const schemes = Array.isArray(doc.schemes)
      ? doc.schemes.filter((s) => typeof s === 'string')
      : [];
    const list = schemes.length ? schemes : ['https'];
    return list.map((s) => ({ url: `${s}://${host}${base}`, variables: {} }));
  }
  if (!Array.isArray(doc.servers)) return [];
  return doc.servers.filter(isObj).flatMap((s) => {
    const url = str(s.url);
    if (url === undefined) return [];
    const variables: Record<string, ServerVariable> = {};
    if (isObj(s.variables))
      for (const [k, v] of Object.entries(s.variables)) {
        if (!isObj(v)) continue;
        variables[k] = {
          default: v.default === undefined ? '' : String(v.default),
          enum: Array.isArray(v.enum) ? v.enum.map(String) : undefined,
          description: str(v.description),
        };
      }
    return [{ url, description: str(s.description), variables }];
  });
}

export function securitySchemes(
  spec: LoadedSpec,
  req: unknown,
): SecurityScheme[] {
  if (!Array.isArray(req)) return [];
  const defs =
    spec.kind === 'swagger2'
      ? resolveObj(spec.doc, spec.doc.securityDefinitions)
      : resolveObj(
          spec.doc,
          resolveObj(spec.doc, spec.doc.components).securitySchemes,
        );
  // The first alternative is the one a request uses.
  const first = req.find(isObj);
  if (!first) return [];
  return Object.keys(first).flatMap((name) => {
    const s = resolveObj(spec.doc, defs[name]);
    const type = str(s.type);
    if (!type) return [];
    return [
      {
        name,
        type,
        paramName: str(s.name),
        in: str(s.in),
        scheme: type === 'basic' ? 'basic' : str(s.scheme)?.toLowerCase(),
      },
    ];
  });
}

/** Swagger 2.0 `in: body` and `in: formData` parameters as a request body. */
export function swaggerRequestBody(
  spec: LoadedSpec,
  op: Obj,
  params: Param[],
): RequestBody {
  const { doc } = spec;
  const consumes = (
    Array.isArray(op.consumes)
      ? op.consumes
      : Array.isArray(doc.consumes)
        ? doc.consumes
        : []
  ).map(String);
  const body = params.find((p) => p.in === 'body');
  if (body) {
    const types = consumes.filter((c) => !/form/.test(c));
    return {
      required: body.required,
      description: body.description,
      contents: (types.length ? types : ['application/json']).map(
        (mediaType) => ({ mediaType, schema: body.schema, hasExample: false }),
      ),
    };
  }
  const properties: Obj = {};
  const required: string[] = [];
  for (const p of params) {
    properties[p.name] = {
      ...(isObj(p.schema) ? p.schema : {}),
      description: p.description,
    };
    if (p.required) required.push(p.name);
  }
  const hasFile = params.some(
    (p) => isObj(p.schema) && p.schema.type === 'file',
  );
  const mediaType =
    hasFile || consumes.includes('multipart/form-data')
      ? 'multipart/form-data'
      : 'application/x-www-form-urlencoded';
  return {
    required: required.length > 0,
    contents: [
      {
        mediaType,
        schema: { type: 'object', properties, required },
        hasExample: false,
      },
    ],
  };
}
