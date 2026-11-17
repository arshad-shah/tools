import { shQuote } from './literals';
import {
  effectiveHeaders,
  formPairs,
  headerValue,
  withoutContentType,
  type CurlRequest,
} from './model';
import type { Generated } from './targets';

/** An HTTPie item key: separators escaped with a backslash. */
const key = (s: string) => s.replace(/([:=@;\\])/g, '\\$1');

/** HTTPie (`http`), one item per line. */
export function toHttpie(req: CurlRequest): Generated {
  const notes: string[] = [];
  const flags: string[] = [];
  const items: string[] = [];
  let tail = '';
  const b = req.body;
  let headers = effectiveHeaders(req);

  if (b.kind === 'data') {
    const pairs = formPairs(req);
    if (pairs) {
      flags.push('--form');
      for (const [k, v] of pairs) items.push(shQuote(`${key(k)}=${v}`));
    } else flags.push(`--raw ${shQuote(b.text)}`);
  } else if (b.kind === 'file') tail = ` < ${shQuote(b.path)}`;
  else if (b.kind === 'form') {
    flags.push('--multipart');
    if (headerValue(headers, 'content-type'))
      notes.push(
        'The multipart Content-Type is left to HTTPie, which adds the boundary.',
      );
    headers = withoutContentType(headers);
    for (const f of b.fields) {
      if (!f.file) items.push(shQuote(`${key(f.name)}=${f.value}`));
      else
        items.push(
          shQuote(
            `${key(f.name)}@${f.value}${f.type ? `;type=${f.type}` : ''}`,
          ),
        );
      if (f.file && f.filename)
        notes.push(
          `HTTPie sends the file's own name; filename=${f.filename} is not kept.`,
        );
    }
  }
  const headerItems = headers.map((h) =>
    shQuote(h.value ? `${key(h.name)}:${h.value}` : `${key(h.name)};`),
  );
  if (req.auth)
    flags.push(`-a ${shQuote(`${req.auth.user}:${req.auth.pass}`)}`);
  if (req.insecure) flags.push('--verify=no');
  if (req.location) flags.push('--follow');

  const ordered = [...headerItems, ...items];
  const first = ['http', ...flags, shQuote(req.method), shQuote(req.url)].join(
    ' ',
  );
  const lines = [first, ...ordered.map((i) => `  ${i}`)];
  return { code: lines.join(' \\\n') + tail, notes };
}
