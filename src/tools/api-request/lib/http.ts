import { ToolError } from '@/shared/lib/errors';
import { applyAuth, fillAuth } from './auth';
import { interpolate } from './env';
import { withParams } from './query';
import type { HttpRequest, KvRow } from './model';

export interface BuiltRequest {
  url: string;
  init: RequestInit & { method: string; headers: Headers };
  /** Variables named in the request with no value in the environment. */
  unresolved: string[];
}

const active = (rows: KvRow[]) =>
  rows.filter((r) => r.enabled && r.key.trim() !== '');

/**
 * Turns the edited request into fetch arguments (spec §8.8 fixes): query
 * params for every method, every body kind, and `{{var}}` interpolation in
 * the URL, params, headers and body. Invalid JSON is INVALID_INPUT.
 */
export function buildRequest(
  req: HttpRequest,
  env: Record<string, string>,
): BuiltRequest {
  const unresolved = new Set<string>();
  const fill = (s: string) => {
    const r = interpolate(s, env);
    r.unresolved.forEach((u) => unresolved.add(u));
    return r.output;
  };

  const baseUrl = withParams(
    fill(req.url.trim()),
    active(req.params).map((p) => [fill(p.key.trim()), fill(p.value)]),
  );
  let headers = new Headers();
  for (const h of active(req.headers)) {
    try {
      headers.append(fill(h.key.trim()), fill(h.value));
    } catch (cause) {
      throw new ToolError('INVALID_INPUT', `Invalid header "${h.key}"`, {
        cause,
      });
    }
  }

  const authed = applyAuth({ url: baseUrl, headers }, fillAuth(req.auth, fill));
  const url = authed.url;
  headers = authed.headers;

  if (req.mode === 'graphql') {
    let variables: unknown = {};
    const vars = fill(req.graphql.variables);
    if (vars.trim()) variables = parseJson(vars, 'GraphQL variables');
    if (!headers.has('content-type'))
      headers.set('content-type', 'application/json');
    return {
      url,
      init: {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: fill(req.graphql.query), variables }),
      },
      unresolved: [...unresolved],
    };
  }

  const method = req.method.toUpperCase();
  const init: BuiltRequest['init'] = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    const b = req.body;
    const setType = (t: string) => {
      if (t && !headers.has('content-type')) headers.set('content-type', t);
    };
    switch (b.kind) {
      case 'json': {
        const text = fill(b.text);
        if (text.trim()) {
          parseJson(text, 'request body');
          init.body = text;
          setType('application/json');
        }
        break;
      }
      case 'raw':
        init.body = fill(b.text);
        setType(b.contentType);
        break;
      case 'urlencoded':
        init.body = new URLSearchParams(
          active(b.form).map((r) => [fill(r.key.trim()), fill(r.value)]),
        ).toString();
        setType('application/x-www-form-urlencoded');
        break;
      case 'form-data': {
        const fd = new FormData();
        for (const r of active(b.form)) {
          if (r.type === 'file') {
            if (r.file) fd.append(fill(r.key.trim()), r.file, r.file.name);
          } else fd.append(fill(r.key.trim()), fill(r.value));
        }
        init.body = fd;
        // The browser writes the multipart boundary itself.
        headers.delete('content-type');
        break;
      }
      case 'binary':
        if (b.file) {
          init.body = b.file;
          setType(b.contentType || b.file.type);
        }
        break;
      case 'none':
        break;
    }
  }
  return { url, init, unresolved: [...unresolved] };
}

function parseJson(text: string, what: string): unknown {
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new ToolError('INVALID_INPUT', `Invalid JSON in ${what}`, { cause });
  }
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: [string, string][];
  bytes: Uint8Array;
  /** Decoded body, unless the content type is binary. */
  text?: string;
  /** Parsed body, only for a JSON content type that parses. */
  json?: unknown;
  size: number;
  contentType: string;
}

const BINARY =
  /^(image|audio|video|font)\/|^application\/(octet-stream|pdf|zip|gzip|x-tar|wasm)/;

export const isJsonType = (ct: string) =>
  /^application\/(.+\+)?json\b/.test(ct) || /\+json\b/.test(ct);

function decode(bytes: Uint8Array, contentType: string): string {
  const charset = /charset="?([^";]+)"?/i.exec(contentType)?.[1]?.trim();
  try {
    return new TextDecoder(charset || 'utf-8').decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/**
 * Reads a fetch Response as bytes, then text by charset, then JSON only when
 * the type says JSON and it parses. The real status is always kept, and an
 * empty or 204 body is not an error.
 */
export async function readResponse(res: Response): Promise<HttpResponse> {
  const bytes = new Uint8Array(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') ?? '';
  const type = contentType.split(';')[0].trim().toLowerCase();
  const headers: [string, string][] = [];
  res.headers.forEach((v, k) => headers.push([k, v]));
  const out: HttpResponse = {
    status: res.status,
    statusText: res.statusText,
    headers,
    bytes,
    size: bytes.length,
    contentType: type,
  };
  if (BINARY.test(type)) return out;
  out.text = decode(bytes, contentType);
  if (isJsonType(type) && out.text.trim()) {
    try {
      out.json = JSON.parse(out.text);
    } catch {
      // Not JSON after all: the text view shows it.
    }
  }
  return out;
}
