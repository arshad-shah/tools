import { jsLiteral, jsString } from './literals';
import {
  basicToken,
  effectiveHeaders,
  headerValue,
  jsonValue,
  withoutContentType,
  type CurlRequest,
  type Header,
} from './model';
import type { Generated } from './targets';

const isAscii = (s: string) => /^[\x20-\x7e]*$/.test(s);

function headerObject(headers: Header[], extra: string[], indent: string) {
  const lines = [
    ...headers.map((h) => `${jsString(h.name)}: ${jsString(h.value)},`),
    ...extra,
  ];
  if (!lines.length) return null;
  return `{\n${lines.map((l) => `${indent}  ${l}`).join('\n')}\n${indent}}`;
}

function basicExpr(user: string, pass: string): string {
  const pair = `${user}:${pass}`;
  return isAscii(pair)
    ? `'Basic ' + btoa(${jsString(pair)})`
    : jsString(`Basic ${basicToken(user, pass)}`);
}

/** Statements before the call (a FormData), the body expression, notes. */
function body(req: CurlRequest): {
  setup: string[];
  expr: string | null;
  usesFs: boolean;
} {
  const b = req.body;
  if (b.kind === 'none') return { setup: [], expr: null, usesFs: false };
  if (b.kind === 'data') {
    const json = jsonValue(req);
    return {
      setup: [],
      expr:
        json !== undefined
          ? `JSON.stringify(${jsLiteral(json, 1)})`
          : jsString(b.text),
      usesFs: false,
    };
  }
  if (b.kind === 'file')
    return {
      setup: [],
      expr: `await openAsBlob(${jsString(b.path)})`,
      usesFs: true,
    };
  const setup = ['const form = new FormData();'];
  let usesFs = false;
  for (const f of b.fields) {
    if (f.file) {
      usesFs = true;
      const name = f.filename ?? f.value.split(/[/\\]/).pop() ?? f.value;
      const opts = f.type ? `, { type: ${jsString(f.type)} }` : '';
      setup.push(
        `form.append(${jsString(f.name)}, await openAsBlob(${jsString(f.value)}${opts}), ${jsString(name)});`,
      );
    } else
      setup.push(`form.append(${jsString(f.name)}, ${jsString(f.value)});`);
  }
  return { setup, expr: 'form', usesFs };
}

function commonNotes(req: CurlRequest, fs: boolean): string[] {
  const notes: string[] = [];
  if (fs)
    notes.push(
      "Files are read with Node's openAsBlob; in a browser, use a File from a file input instead.",
    );
  if (req.body.kind === 'form' && headerValue(req.headers, 'content-type'))
    notes.push(
      'The multipart Content-Type is left to FormData, which adds the boundary.',
    );
  return notes;
}

/** JavaScript `fetch`. */
export function toFetch(req: CurlRequest): Generated {
  const notes: string[] = [];
  let headers = effectiveHeaders(req);
  if (req.body.kind === 'form') headers = withoutContentType(headers);
  const extra = req.auth
    ? [`Authorization: ${basicExpr(req.auth.user, req.auth.pass)},`]
    : [];
  const { setup, expr, usesFs } = body(req);
  const opts: string[] = [];
  if (req.method !== 'GET') opts.push(`method: ${jsString(req.method)},`);
  const h = headerObject(headers, extra, '  ');
  if (h) opts.push(`headers: ${h},`);
  if (expr) opts.push(`body: ${expr},`);
  const call = `const response = await fetch(${jsString(req.url)}${
    opts.length ? `, {\n${opts.map((o) => `  ${o}`).join('\n')}\n}` : ''
  });`;
  const lines = [
    ...(usesFs ? ["import { openAsBlob } from 'node:fs';", ''] : []),
    ...(setup.length ? [...setup, ''] : []),
    call,
    '',
    'const text = await response.text();',
  ];
  notes.push(...commonNotes(req, usesFs));
  if (req.insecure)
    notes.push('fetch cannot skip certificate checks: -k has no equivalent.');
  if (headers.some((x) => /^cookie$/i.test(x.name)))
    notes.push(
      'Browsers do not let a page set the Cookie header; Node sends it.',
    );
  return { code: lines.join('\n'), notes };
}

/** axios (Node). */
export function toAxios(req: CurlRequest): Generated {
  let headers = effectiveHeaders(req);
  if (req.body.kind === 'form') headers = withoutContentType(headers);
  const { setup, expr, usesFs } = body(req);
  const json = jsonValue(req);
  const opts: string[] = [
    `method: ${jsString(req.method.toLowerCase())},`,
    `url: ${jsString(req.url)},`,
  ];
  const h = headerObject(headers, [], '  ');
  if (h) opts.push(`headers: ${h},`);
  if (expr)
    opts.push(`data: ${json !== undefined ? jsLiteral(json, 1) : expr},`);
  if (req.auth)
    opts.push(
      `auth: {\n    username: ${jsString(req.auth.user)},\n    password: ${jsString(req.auth.pass)},\n  },`,
    );
  if (req.insecure)
    opts.push('httpsAgent: new https.Agent({ rejectUnauthorized: false }),');
  const imports = ["import axios from 'axios';"];
  if (req.insecure) imports.push("import https from 'node:https';");
  if (usesFs) imports.push("import { openAsBlob } from 'node:fs';");
  const lines = [
    ...imports,
    '',
    ...(setup.length ? [...setup, ''] : []),
    `const response = await axios({\n${opts.map((o) => `  ${o}`).join('\n')}\n});`,
    '',
    'console.log(response.data);',
  ];
  const notes = commonNotes(req, usesFs);
  return { code: lines.join('\n'), notes };
}
