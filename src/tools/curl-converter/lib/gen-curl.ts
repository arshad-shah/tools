import { shQuote } from './literals';
import { impliedMethod, type CurlRequest, type FormField } from './model';

function formArg(f: FormField): string {
  if (f.file) {
    let v = `${f.name}=@${f.value}`;
    if (f.type) v += `;type=${f.type}`;
    if (f.filename) v += `;filename=${f.filename}`;
    return `-F ${shQuote(v)}`;
  }
  // A value that starts with @ or < would be read as a file by -F.
  if (/^[@<]/.test(f.value))
    return `--form-string ${shQuote(`${f.name}=${f.value}`)}`;
  const v = f.type
    ? `${f.name}=${f.value};type=${f.type}`
    : `${f.name}=${f.value}`;
  return `-F ${shQuote(v)}`;
}

/**
 * The request as one tidy curl command for bash, one option per line:
 * the method only when the body does not imply it, the body as
 * `--data-raw` so nothing in it is read as a file.
 */
export function toCurl(req: CurlRequest): string {
  const first: string[] = ['curl'];
  const head = req.method === 'HEAD' && req.body.kind === 'none';
  if (head) first.push('-I');
  else if (req.method !== impliedMethod(req))
    first.push('-X', shQuote(req.method));
  first.push(shQuote(req.url));

  const lines: string[] = [];
  for (const h of req.headers)
    lines.push(
      `-H ${shQuote(h.value ? `${h.name}: ${h.value}` : `${h.name};`)}`,
    );
  if (req.auth)
    lines.push(`-u ${shQuote(`${req.auth.user}:${req.auth.pass}`)}`);
  if (req.cookie) lines.push(`-b ${shQuote(req.cookie)}`);
  const b = req.body;
  if (b.kind === 'data') lines.push(`--data-raw ${shQuote(b.text)}`);
  else if (b.kind === 'file')
    lines.push(
      b.upload
        ? `-T ${shQuote(b.path)}`
        : `--data-binary ${shQuote(`@${b.path}`)}`,
    );
  else if (b.kind === 'form') for (const f of b.fields) lines.push(formArg(f));
  const flags: string[] = [];
  if (req.compressed) flags.push('--compressed');
  if (req.insecure) flags.push('-k');
  if (req.location) flags.push('-L');
  if (flags.length) lines.push(flags.join(' '));

  if (!lines.length) return first.join(' ');
  return [first.join(' '), ...lines.map((l) => `  ${l}`)].join(' \\\n');
}
