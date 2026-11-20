import type { HandoffPayload } from '@/shared/lib/handoff';
import type { MediaContent, Operation, Param, Server } from './api';
import { exampleFor } from './example';
import { isObj, resolve } from './refs';

export const CURL_MIME = 'application/x-curl';

/** A request built from an operation, ready to send or copy. */
export interface BuiltRequest {
  method: string;
  url: string;
  headers: [string, string][];
  /** -u user:pass */
  basic?: [string, string];
  body?:
    | { kind: 'text'; mediaType: string; text: string }
    | {
        kind: 'form';
        fields: { name: string; value: string; file: boolean }[];
      };
}

/** `{{name}}`: an HTTP Client environment variable to fill in. */
const placeholder = (name: string) => `{{${name.replace(/[{}\s]/g, '_')}}}`;
const isPlaceholder = (v: string) => /^\{\{[^{}]+\}\}$/.test(v);

const ABSOLUTE = /^[a-z][a-z0-9+.-]*:\/\//i;

/** True when the server URL has no scheme and host of its own. */
export function isRelativeServer(server: Server | undefined): boolean {
  return !server || !ABSOLUTE.test(server.url);
}

/**
 * The server's URL with its variables at their defaults, no trailing slash.
 * A relative URL (or no server) goes under `origin`, by default
 * `https://{{host}}` so the scheme survives the HTTP Client's import.
 */
export function serverUrl(server: Server | undefined, origin = ''): string {
  const base = (origin.trim() || `https://${placeholder('host')}`).replace(
    /\/+$/,
    '',
  );
  if (!server) return base;
  let url = server.url.replace(/\{([^}]+)\}/g, (_m, name: string) => {
    const v = server.variables[name];
    return v && v.default ? v.default : placeholder(name);
  });
  url = url.replace(/\/+$/, '');
  if (ABSOLUTE.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `${base}${url && !url.startsWith('/') ? '/' : ''}${url}`;
}

/** A parameter's example: its own, its schema's, or a placeholder. */
function paramValue(doc: unknown, p: Param): unknown {
  if (p.example !== undefined) return p.example;
  const s = resolve(doc, p.schema).value;
  if (
    isObj(s) &&
    ('example' in s ||
      'default' in s ||
      'const' in s ||
      (Array.isArray(s.enum) && s.enum.length) ||
      (Array.isArray(s.examples) && s.examples.length))
  )
    return exampleFor(doc, s);
  return placeholder(p.name);
}

const hasOwnExample = (doc: unknown, p: Param) =>
  !isPlaceholder(String(paramValue(doc, p)));

const asText = (v: unknown) =>
  typeof v === 'string'
    ? v
    : v === null || v === undefined
      ? ''
      : JSON.stringify(v);

const encode = (v: string) => (isPlaceholder(v) ? v : encodeURIComponent(v));

/** The media type a request body is sent as: JSON first. */
function pickContent(contents: MediaContent[]): MediaContent | undefined {
  return (
    contents.find((c) => /^application\/(.+\+)?json\b/i.test(c.mediaType)) ??
    contents.find((c) => !/^\*\/\*$/.test(c.mediaType)) ??
    contents[0]
  );
}

/**
 * The request for an operation: the server and path with example or
 * `{{placeholder}}` parameters, required query and header parameters (and
 * optional ones that have an example), credentials as placeholders, and a
 * body made from the schema.
 */
export function buildRequest(
  doc: unknown,
  op: Operation,
  server: Server | undefined,
  origin = '',
): BuiltRequest {
  let path = op.path;
  const query: [string, string][] = [];
  const headers: [string, string][] = [];
  const cookies: string[] = [];
  for (const p of op.parameters) {
    if (p.in === 'path') {
      const v = asText(paramValue(doc, p));
      path = path.split(`{${p.name}}`).join(encode(v));
      continue;
    }
    if (!p.required && !hasOwnExample(doc, p)) continue;
    const raw = paramValue(doc, p);
    const values = Array.isArray(raw) ? raw.map(asText) : [asText(raw)];
    if (p.in === 'query') for (const v of values) query.push([p.name, v]);
    else if (p.in === 'header') headers.push([p.name, values.join(',')]);
    else if (p.in === 'cookie') cookies.push(`${p.name}=${values.join(',')}`);
  }

  let basic: BuiltRequest['basic'];
  for (const s of op.security) {
    if (s.type === 'apiKey' && s.paramName) {
      const v = placeholder(s.name);
      if (s.in === 'query') query.push([s.paramName, v]);
      else if (s.in === 'cookie') cookies.push(`${s.paramName}=${v}`);
      else headers.push([s.paramName, v]);
    } else if (
      s.type === 'basic' ||
      (s.type === 'http' && s.scheme === 'basic')
    )
      basic = [placeholder('username'), placeholder('password')];
    else if (s.type === 'http')
      headers.push([
        'Authorization',
        `${s.scheme === 'bearer' ? 'Bearer' : (s.scheme ?? 'Bearer')} ${placeholder('token')}`,
      ]);
    else if (s.type === 'oauth2' || s.type === 'openIdConnect')
      headers.push(['Authorization', `Bearer ${placeholder('accessToken')}`]);
  }
  if (cookies.length) headers.push(['Cookie', cookies.join('; ')]);

  const ok = op.responses.find((r) => /^2/.test(r.status)) ?? op.responses[0];
  const accept = ok && pickContent(ok.contents)?.mediaType;
  if (accept && !headers.some(([k]) => /^accept$/i.test(k)))
    headers.push(['Accept', accept]);

  let body: BuiltRequest['body'];
  const content = op.requestBody && pickContent(op.requestBody.contents);
  if (content) {
    const example = content.hasExample
      ? content.example
      : exampleFor(doc, content.schema, { skip: 'readOnly' });
    const mt = content.mediaType;
    if (/multipart\/form-data/i.test(mt)) {
      const props = resolve(doc, content.schema).value;
      const pr =
        isObj(props) && isObj(props.properties) ? props.properties : {};
      const fields = Object.entries(isObj(example) ? example : {}).map(
        ([name, v]) => {
          const s = resolve(doc, pr[name]).value;
          const file = isObj(s) && (s.format === 'binary' || s.type === 'file');
          return { name, value: file ? `${name}.bin` : asText(v), file };
        },
      );
      body = { kind: 'form', fields };
    } else {
      let text: string;
      if (/x-www-form-urlencoded/i.test(mt) && isObj(example))
        text = Object.entries(example)
          .map(
            ([k, v]) =>
              `${encodeURIComponent(k)}=${encodeURIComponent(asText(v))}`,
          )
          .join('&');
      else if (typeof example === 'string') text = example;
      else text = JSON.stringify(example ?? {}, null, 2);
      body = { kind: 'text', mediaType: mt, text };
      if (!headers.some(([k]) => /^content-type$/i.test(k)) && mt !== '*/*')
        headers.unshift(['Content-Type', mt]);
    }
  }

  const qs = query
    .map(([k, v]) => `${encodeURIComponent(k)}=${encode(v)}`)
    .join('&');
  return {
    method: op.method,
    url: `${serverUrl(server, origin)}${path}${qs ? `?${qs}` : ''}`,
    headers,
    basic,
    body,
  };
}

/** A POSIX shell word: bare when safe, else single-quoted. */
const sh = (s: string) =>
  /^[A-Za-z0-9_\-.,:/@%+=]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;

/** The request as a curl command for bash. */
export function toCurlCommand(r: BuiltRequest): string {
  const implied = r.body ? 'POST' : 'GET';
  const first = ['curl'];
  if (r.method === 'HEAD' && !r.body) first.push('-I');
  else if (r.method !== implied) first.push('-X', r.method);
  first.push(sh(r.url));
  const lines = r.headers.map(([k, v]) => `-H ${sh(`${k}: ${v}`)}`);
  if (r.basic) lines.push(`-u ${sh(`${r.basic[0]}:${r.basic[1]}`)}`);
  if (r.body?.kind === 'text') lines.push(`--data-raw ${sh(r.body.text)}`);
  else if (r.body?.kind === 'form')
    for (const f of r.body.fields)
      lines.push(
        f.file
          ? `-F ${sh(`${f.name}=@${f.value}`)}`
          : /^[@<]/.test(f.value)
            ? `--form-string ${sh(`${f.name}=${f.value}`)}`
            : `-F ${sh(`${f.name}=${f.value}`)}`,
      );
  if (!lines.length) return first.join(' ');
  return [first.join(' '), ...lines.map((l) => `  ${l}`)].join(' \\\n');
}

/** "Send to HTTP Client": as curl, so the body and auth come along. */
export function toHttpClient(r: BuiltRequest): HandoffPayload {
  return {
    kind: 'text',
    mime: CURL_MIME,
    sourceTool: 'openapi-viewer',
    text: toCurlCommand(r),
  };
}
