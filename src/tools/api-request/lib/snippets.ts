import { bytesToBase64, utf8Encode } from '@/shared/lib/encoding';
import { applyAuth, fillAuth } from './auth';
import { interpolate } from './env';
import type { HttpRequest } from './model';
import { withParams } from './query';

export type SnippetLang =
  | 'curl'
  | 'fetch'
  | 'axios'
  | 'python'
  | 'httpie'
  | 'node';

export const SNIPPET_LANGS: { id: SnippetLang; label: string }[] = [
  { id: 'curl', label: 'cURL' },
  { id: 'fetch', label: 'JavaScript fetch' },
  { id: 'axios', label: 'axios' },
  { id: 'python', label: 'Python requests' },
  { id: 'httpie', label: 'HTTPie' },
  { id: 'node', label: 'Node fetch' },
];

type Body =
  | { type: 'none' }
  | { type: 'json'; text: string }
  | { type: 'text'; text: string }
  | { type: 'urlencoded'; pairs: [string, string][] }
  | { type: 'form'; fields: { key: string; value?: string; file?: string }[] }
  | { type: 'file'; name: string };

interface Model {
  method: string;
  url: string;
  headers: [string, string][];
  /** Basic auth kept apart so cURL can use -u and Python auth=. */
  basic?: [string, string];
  body: Body;
}

export interface SnippetOptions {
  /** Fill `{{vars}}` from these values ("Include variable values"). */
  vars?: Record<string, string>;
}

/** The request as snippet parts. Variables stay as `{{name}}` unless given. */
function model(req: HttpRequest, vars?: Record<string, string>): Model {
  const fill = (s: string) => (vars ? interpolate(s, vars).output : s);
  const rows = (rs: HttpRequest['params']) =>
    rs.filter((r) => r.enabled && r.key.trim());
  let url = withParams(
    fill(req.url.trim()),
    rows(req.params).map((p) => [fill(p.key.trim()), fill(p.value)]),
  );
  let headers: [string, string][] = rows(req.headers).map((h) => [
    fill(h.key.trim()),
    fill(h.value),
  ]);
  let basic: [string, string] | undefined;
  const auth = fillAuth(req.auth, fill);
  if (auth.kind === 'basic') basic = [auth.user, auth.pass];
  else if (auth.kind !== 'none') {
    const t = applyAuth({ url, headers: new Headers() }, auth);
    url = t.url;
    const authHeaders = [...t.headers].map(
      ([k]) => [authName(auth, k), t.headers.get(k) ?? ''] as [string, string],
    );
    headers = [
      ...headers.filter(
        ([k]) =>
          !authHeaders.some(([a]) => a.toLowerCase() === k.toLowerCase()),
      ),
      ...authHeaders,
    ];
  }
  const hasType = () =>
    headers.some(([k]) => k.toLowerCase() === 'content-type');

  if (req.mode === 'graphql') {
    let variables: unknown;
    try {
      variables = JSON.parse(fill(req.graphql.variables) || '{}');
    } catch {
      variables = {};
    }
    if (!hasType()) headers.push(['Content-Type', 'application/json']);
    return {
      method: 'POST',
      url,
      headers,
      basic,
      body: {
        type: 'json',
        text: JSON.stringify({ query: fill(req.graphql.query), variables }),
      },
    };
  }
  const method = req.method.toUpperCase();
  const b = req.body;
  let body: Body = { type: 'none' };
  if (method !== 'GET' && method !== 'HEAD') {
    if (b.kind === 'json' && b.text.trim()) {
      body = { type: 'json', text: fill(b.text) };
      if (!hasType()) headers.push(['Content-Type', 'application/json']);
    } else if (b.kind === 'raw') {
      body = { type: 'text', text: fill(b.text) };
      if (b.contentType && !hasType())
        headers.push(['Content-Type', b.contentType]);
    } else if (b.kind === 'urlencoded')
      body = {
        type: 'urlencoded',
        pairs: rows(b.form).map((r) => [fill(r.key.trim()), fill(r.value)]),
      };
    else if (b.kind === 'form-data') {
      headers = headers.filter(([k]) => k.toLowerCase() !== 'content-type');
      body = {
        type: 'form',
        fields: rows(b.form).map((r) =>
          r.type === 'file'
            ? {
                key: fill(r.key.trim()),
                file: r.file?.name || r.value || 'file',
              }
            : { key: fill(r.key.trim()), value: fill(r.value) },
        ),
      };
    } else if (b.kind === 'binary')
      body = { type: 'file', name: b.file?.name || 'body.bin' };
  }
  return { method, url, headers, basic, body };
}

/** Header names keep the user's spelling for API keys, a tidy one otherwise. */
function authName(auth: HttpRequest['auth'], lower: string): string {
  if (auth.kind === 'apikey' && auth.name.trim().toLowerCase() === lower)
    return auth.name.trim();
  return lower === 'authorization' ? 'Authorization' : lower;
}

/** POSIX single-quoting. */
export const shq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
const js = (v: unknown) => JSON.stringify(v);

function pyLiteral(v: unknown, indent = ''): string {
  if (v === null) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'number' || typeof v === 'string') return JSON.stringify(v);
  const inner = `${indent}    `;
  if (Array.isArray(v))
    return v.length
      ? `[\n${v.map((x) => inner + pyLiteral(x, inner)).join(',\n')},\n${indent}]`
      : '[]';
  const entries = Object.entries(v as Record<string, unknown>);
  return entries.length
    ? `{\n${entries
        .map(([k, x]) => `${inner}${JSON.stringify(k)}: ${pyLiteral(x, inner)}`)
        .join(',\n')},\n${indent}}`
    : '{}';
}

const pyDict = (pairs: [string, string][]) =>
  pyLiteral(Object.fromEntries(pairs), '    ');

function curl(m: Model): string {
  const parts = [`curl -X ${m.method} ${shq(m.url)}`];
  for (const [k, v] of m.headers) parts.push(`-H ${shq(`${k}: ${v}`)}`);
  if (m.basic) parts.push(`-u ${shq(`${m.basic[0]}:${m.basic[1]}`)}`);
  const b = m.body;
  if (b.type === 'json' || b.type === 'text')
    parts.push(`--data-raw ${shq(b.text)}`);
  else if (b.type === 'urlencoded')
    for (const [k, v] of b.pairs)
      parts.push(`--data-urlencode ${shq(`${k}=${v}`)}`);
  else if (b.type === 'form')
    for (const f of b.fields)
      parts.push(
        f.file !== undefined
          ? `-F ${shq(`${f.key}=@${f.file}`)}`
          : `--form-string ${shq(`${f.key}=${f.value ?? ''}`)}`,
      );
  else if (b.type === 'file') parts.push(`--data-binary ${shq(`@${b.name}`)}`);
  return parts.join(' \\\n  ');
}

function jsHeaders(m: Model, indent: string): string {
  const all: [string, string][] = [...m.headers];
  if (m.basic)
    all.push([
      'Authorization',
      `Basic ${bytesToBase64(utf8Encode(`${m.basic[0]}:${m.basic[1]}`))}`,
    ]);
  if (!all.length) return '';
  const lines = all.map(([k, v]) => `${indent}  ${js(k)}: ${js(v)},`);
  return `{\n${lines.join('\n')}\n${indent}}`;
}

/** Statements that build `body` for fetch-style APIs, and its expression. */
function jsBody(m: Model, node: boolean): { pre: string[]; expr?: string } {
  const b = m.body;
  switch (b.type) {
    case 'none':
      return { pre: [] };
    case 'json':
      return { pre: [], expr: `JSON.stringify(${jsonOrText(b.text)})` };
    case 'text':
      return { pre: [], expr: js(b.text) };
    case 'urlencoded':
      return {
        pre: [],
        expr: `new URLSearchParams(${js(b.pairs)})`,
      };
    case 'form': {
      const pre = ['const form = new FormData();'];
      for (const f of b.fields)
        pre.push(
          f.file !== undefined
            ? node
              ? `form.append(${js(f.key)}, new Blob([await readFile(${js(f.file)})]), ${js(f.file)});`
              : `form.append(${js(f.key)}, fileInput.files[0]); // ${f.file}`
            : `form.append(${js(f.key)}, ${js(f.value ?? '')});`,
        );
      return { pre, expr: 'form' };
    }
    case 'file':
      return node
        ? { pre: [], expr: `await readFile(${js(b.name)})` }
        : { pre: [`// ${b.name}`], expr: 'fileInput.files[0]' };
  }
}

/** A JSON body as a JS literal when it parses (pretty), else its text. */
function jsonOrText(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2).replace(/\n/g, '\n  ');
  } catch {
    return `JSON.parse(${js(text)})`;
  }
}

function fetchLike(m: Model, node: boolean): string {
  const { pre, expr } = jsBody(m, node);
  const opts = [`  method: ${js(m.method)},`];
  const h = jsHeaders(m, '  ');
  if (h) opts.push(`  headers: ${h},`);
  if (expr) opts.push(`  body: ${expr},`);
  const lines: string[] = [];
  if (node && (m.body.type === 'form' || m.body.type === 'file'))
    lines.push("import { readFile } from 'node:fs/promises';", '');
  lines.push(...pre);
  lines.push(`const res = await fetch(${js(m.url)}, {`, ...opts, '});');
  lines.push(
    node
      ? 'console.log(res.status, await res.text());'
      : 'const data = await res.text();',
  );
  return lines.join('\n');
}

function axios(m: Model): string {
  const lines: string[] = ["import axios from 'axios';", ''];
  const opts = [
    `  method: ${js(m.method.toLowerCase())},`,
    `  url: ${js(m.url)},`,
  ];
  const h = jsHeaders(m, '  ');
  if (h) opts.push(`  headers: ${h},`);
  const b = m.body;
  if (b.type === 'json') opts.push(`  data: ${jsonOrText(b.text)},`);
  else {
    const { pre, expr } = jsBody(m, false);
    lines.push(...pre);
    if (expr) opts.push(`  data: ${expr},`);
  }
  lines.push('const res = await axios({', ...opts, '});');
  return lines.join('\n');
}

function python(m: Model): string {
  const fn = m.method.toLowerCase();
  const known = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
  const args: string[] = [];
  const b = m.body;
  if (b.type === 'json') {
    try {
      args.push(`json=${pyLiteral(JSON.parse(b.text), '    ')}`);
    } catch {
      args.push(`data=${js(b.text)}`);
    }
  } else if (b.type === 'text') args.push(`data=${js(b.text)}`);
  else if (b.type === 'urlencoded') args.push(`data=${pyDict(b.pairs)}`);
  else if (b.type === 'form') {
    const data = b.fields.filter((f) => f.file === undefined);
    const files = b.fields.filter((f) => f.file !== undefined);
    if (data.length)
      args.push(`data=${pyDict(data.map((f) => [f.key, f.value ?? '']))}`);
    if (files.length)
      args.push(
        `files={${files.map((f) => `${js(f.key)}: open(${js(f.file)}, "rb")`).join(', ')}}`,
      );
  } else if (b.type === 'file') args.push(`data=open(${js(b.name)}, "rb")`);
  // requests sets the JSON content type itself.
  const headers = m.headers.filter(
    ([k, v]) =>
      !(
        b.type === 'json' &&
        k.toLowerCase() === 'content-type' &&
        v === 'application/json'
      ),
  );
  if (headers.length) args.push(`headers=${pyDict(headers)}`);
  if (m.basic) args.push(`auth=(${js(m.basic[0])}, ${js(m.basic[1])})`);
  const call = known.includes(fn)
    ? `requests.${fn}(url`
    : `requests.request(${js(m.method)}, url`;
  const body = args.length ? `,\n    ${args.join(',\n    ')},\n)` : ')';
  return [
    'import requests',
    '',
    `url = ${js(m.url)}`,
    `response = ${call}${body}`,
    'print(response.status_code, response.text)',
  ].join('\n');
}

function httpie(m: Model): string {
  const b = m.body;
  const parts = ['http'];
  if (b.type === 'form' || b.type === 'urlencoded') parts.push('--form');
  if (b.type === 'json' || b.type === 'text')
    parts.push(`--raw ${shq(b.text)}`);
  if (m.basic) parts.push(`--auth ${shq(`${m.basic[0]}:${m.basic[1]}`)}`);
  parts.push(m.method, shq(m.url));
  for (const [k, v] of m.headers) parts.push(shq(`${k}:${v}`));
  if (b.type === 'urlencoded')
    for (const [k, v] of b.pairs) parts.push(shq(`${k}=${v}`));
  if (b.type === 'form')
    for (const f of b.fields)
      parts.push(
        shq(
          f.file !== undefined
            ? `${f.key}@${f.file}`
            : `${f.key}=${f.value ?? ''}`,
        ),
      );
  let out = parts.join(' ');
  if (b.type === 'file') out += ` < ${shq(b.name)}`;
  return out;
}

/** The request as code in `lang`. Variables stay `{{name}}` unless `opts.vars`. */
export function toSnippet(
  req: HttpRequest,
  lang: SnippetLang,
  opts: SnippetOptions = {},
): string {
  const m = model(req, opts.vars);
  switch (lang) {
    case 'curl':
      return curl(m);
    case 'fetch':
      return fetchLike(m, false);
    case 'node':
      return fetchLike(m, true);
    case 'axios':
      return axios(m);
    case 'python':
      return python(m);
    case 'httpie':
      return httpie(m);
  }
}
