import type { LoadedSpec } from './load';
import {
  contents,
  securitySchemes,
  servers,
  str,
  swaggerParamSchema,
  swaggerRequestBody,
} from './parts';
import { isObj, resolve, resolveObj } from './refs';
import {
  HTTP_METHODS,
  UNTAGGED,
  type Api,
  type Operation,
  type Param,
  type RequestBody,
  type TagGroup,
} from './types';

export * from './types';

/** The document as tag groups of operations, with servers and info. */
export function buildApi(spec: LoadedSpec): Api {
  const { doc } = spec;
  const problems: string[] = [];
  const info = resolveObj(doc, doc.info);
  const groups = new Map<string, TagGroup>();
  if (Array.isArray(doc.tags))
    for (const t of doc.tags.filter(isObj)) {
      const name = str(t.name);
      if (name && !groups.has(name))
        groups.set(name, {
          name,
          description: str(t.description),
          operations: [],
        });
    }

  const param = (raw: unknown, where: string): Param | null => {
    const r = resolve(doc, raw);
    if (r.missing || r.circular) {
      problems.push(
        `${where}: parameter ${r.missing ?? r.circular} cannot be resolved`,
      );
      return null;
    }
    const p = isObj(r.value) ? r.value : null;
    const name = p && str(p.name);
    const loc = p && str(p.in);
    if (!p || !name || !loc) return null;
    return {
      name,
      in: loc as Param['in'],
      required: loc === 'path' || p.required === true,
      description: str(p.description),
      deprecated: p.deprecated === true,
      schema:
        spec.kind === 'swagger2' && loc !== 'body'
          ? swaggerParamSchema(p)
          : p.schema,
      example:
        p.example ??
        (isObj(p.examples)
          ? resolveObj(doc, Object.values(p.examples)[0]).value
          : undefined),
    };
  };

  const paths = resolveObj(doc, doc.paths);
  let count = 0;
  for (const [path, rawItem] of Object.entries(paths)) {
    const item = resolveObj(doc, rawItem);
    const shared = Array.isArray(item.parameters) ? item.parameters : [];
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!isObj(op)) continue;
      const id = `${method.toUpperCase()} ${path}`;
      // Operation parameters override path-level ones with the same name and place.
      const byKey = new Map<string, Param>();
      const swaggerBody: Param[] = [];
      for (const raw of [
        ...shared,
        ...(Array.isArray(op.parameters) ? op.parameters : []),
      ]) {
        const p = param(raw, id);
        if (!p) continue;
        if (p.in === 'body' || p.in === 'formData') swaggerBody.push(p);
        else byKey.set(`${p.in}:${p.name}`, p);
      }
      let requestBody: RequestBody | undefined;
      if (spec.kind === 'openapi3' && op.requestBody !== undefined) {
        const rb = resolveObj(doc, op.requestBody);
        requestBody = {
          required: rb.required === true,
          description: str(rb.description),
          contents: contents(doc, rb.content),
        };
      } else if (swaggerBody.length) {
        requestBody = swaggerRequestBody(spec, op, swaggerBody);
      }
      const responses = Object.entries(resolveObj(doc, op.responses)).map(
        ([status, raw]) => {
          const r = resolveObj(doc, raw);
          const produces = Array.isArray(op.produces)
            ? op.produces
            : Array.isArray(doc.produces)
              ? doc.produces
              : ['application/json'];
          return {
            status,
            description: str(r.description),
            contents:
              spec.kind === 'swagger2'
                ? r.schema !== undefined || isObj(r.examples)
                  ? [
                      {
                        mediaType: String(produces[0] ?? 'application/json'),
                        schema: r.schema,
                        example: isObj(r.examples)
                          ? Object.values(r.examples)[0]
                          : undefined,
                        hasExample:
                          isObj(r.examples) &&
                          Object.keys(r.examples).length > 0,
                      },
                    ]
                  : []
                : contents(doc, r.content),
          };
        },
      );
      const tags = Array.isArray(op.tags)
        ? op.tags.filter((t): t is string => typeof t === 'string')
        : [];
      const operation: Operation = {
        id,
        method: method.toUpperCase(),
        path,
        operationId: str(op.operationId),
        summary: str(op.summary),
        description: str(op.description) ?? str(item.description),
        tags,
        deprecated: op.deprecated === true,
        parameters: [...byKey.values()],
        requestBody,
        responses,
        security: securitySchemes(spec, op.security ?? doc.security),
      };
      const tag = tags[0] ?? UNTAGGED;
      if (!groups.has(tag)) groups.set(tag, { name: tag, operations: [] });
      groups.get(tag)?.operations.push(operation);
      count++;
    }
  }

  return {
    title: str(info.title) ?? 'Untitled API',
    version:
      str(info.version) ??
      (info.version !== undefined ? String(info.version) : ''),
    description: str(info.description),
    specVersion: spec.version,
    kind: spec.kind,
    servers: servers(spec),
    groups: [...groups.values()].filter((g) => g.operations.length),
    operationCount: count,
    problems,
  };
}
