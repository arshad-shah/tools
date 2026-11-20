import { pyLiteral, pyString } from './literals';
import {
  effectiveHeaders,
  formPairs,
  headerValue,
  jsonValue,
  withoutContentType,
  type CurlRequest,
} from './model';
import type { Generated } from './targets';

const SHORTCUTS = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

function dict(pairs: [string, string][]): string {
  const unique = new Set(pairs.map(([k]) => k)).size === pairs.length;
  const items = pairs.map(([k, v]) =>
    unique
      ? `${pyString(k)}: ${pyString(v)},`
      : `(${pyString(k)}, ${pyString(v)}),`,
  );
  const [open, close] = unique ? ['{', '}'] : ['[', ']'];
  return `${open}\n${items.map((i) => `    ${i}`).join('\n')}\n${close}`;
}

/** Python `requests`. */
export function toPython(req: CurlRequest): Generated {
  const notes: string[] = [];
  const blocks: string[] = ['import requests'];
  const args: string[] = [pyString(req.url)];

  let headers = effectiveHeaders(req);
  if (req.body.kind === 'form') {
    if (headerValue(headers, 'content-type'))
      notes.push(
        'The multipart Content-Type is left to requests, which adds the boundary.',
      );
    headers = withoutContentType(headers);
  }
  if (headers.length) {
    blocks.push(`headers = ${dict(headers.map((h) => [h.name, h.value]))}`);
    args.push('headers=headers');
  }

  const b = req.body;
  if (b.kind === 'data') {
    const json = jsonValue(req);
    const pairs = formPairs(req);
    if (json !== undefined) {
      blocks.push(`json_data = ${pyLiteral(json)}`);
      args.push('json=json_data');
    } else if (pairs) {
      blocks.push(`data = ${dict(pairs)}`);
      args.push('data=data');
    } else {
      blocks.push(`data = ${pyString(b.text)}`);
      args.push('data=data.encode()');
    }
  } else if (b.kind === 'file') {
    args.push(`data=open(${pyString(b.path)}, 'rb')`);
  } else if (b.kind === 'form') {
    const items = b.fields.map((f) => {
      if (!f.file)
        return `(${pyString(f.name)}, (None, ${pyString(f.value)})),`;
      const name = f.filename ?? f.value.split(/[/\\]/).pop() ?? f.value;
      const parts = [pyString(name), `open(${pyString(f.value)}, 'rb')`];
      if (f.type) parts.push(pyString(f.type));
      return `(${pyString(f.name)}, (${parts.join(', ')})),`;
    });
    blocks.push(`files = [\n${items.map((i) => `    ${i}`).join('\n')}\n]`);
    args.push('files=files');
  }

  if (req.auth)
    args.push(`auth=(${pyString(req.auth.user)}, ${pyString(req.auth.pass)})`);
  if (req.insecure) args.push('verify=False');
  if (req.location && req.method.toUpperCase() === 'HEAD')
    args.push('allow_redirects=True');

  const short = SHORTCUTS.has(req.method);
  const fn = short
    ? `requests.${req.method.toLowerCase()}`
    : 'requests.request';
  const all = short ? args : [pyString(req.method), ...args];
  const oneLine = `response = ${fn}(${all.join(', ')})`;
  const callText =
    oneLine.length <= 88
      ? oneLine
      : `response = ${fn}(\n${all.map((a) => `    ${a},`).join('\n')}\n)`;
  blocks.push(`${callText}\nprint(response.status_code)\nprint(response.text)`);
  return { code: blocks.join('\n\n'), notes };
}
