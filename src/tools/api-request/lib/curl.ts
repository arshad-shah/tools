import { ToolError } from '@/shared/lib/errors';
import { newId } from '@/shared/lib/id';
import { emptyRequest, type HttpRequest, type KvRow } from './model';

const bad = (message: string) => new ToolError('INVALID_INPUT', message);

/**
 * Splits a shell command line the way a POSIX shell would for a pasted cURL
 * command: single quotes are literal, double quotes allow `\"`, `\\`, `\$`
 * and `` \` ``, a backslash escapes the next character, and a backslash
 * before a newline joins lines. `$'...'` keeps its common escapes.
 */
export function tokenize(cmd: string): string[] {
  const out: string[] = [];
  let cur = '';
  let has = false;
  let i = 0;
  const push = () => {
    if (has) out.push(cur);
    cur = '';
    has = false;
  };
  while (i < cmd.length) {
    const c = cmd[i];
    if (c === '\\') {
      const n = cmd[i + 1];
      if (n === '\n' || (n === '\r' && cmd[i + 2] === '\n')) {
        i += n === '\n' ? 2 : 3;
        continue;
      }
      if (n !== undefined) {
        cur += n;
        has = true;
      }
      i += 2;
    } else if (c === "'") {
      const end = cmd.indexOf("'", i + 1);
      if (end < 0) throw bad('The cURL command has an unterminated quote');
      cur += cmd.slice(i + 1, end);
      has = true;
      i = end + 1;
    } else if (c === '$' && cmd[i + 1] === "'") {
      i += 2;
      const ESC: Record<string, string> = { n: '\n', t: '\t', r: '\r' };
      while (i < cmd.length && cmd[i] !== "'") {
        if (cmd[i] === '\\' && i + 1 < cmd.length) {
          cur += ESC[cmd[i + 1]] ?? cmd[i + 1];
          i += 2;
        } else cur += cmd[i++];
      }
      if (i >= cmd.length)
        throw bad('The cURL command has an unterminated quote');
      has = true;
      i++;
    } else if (c === '"') {
      i++;
      while (i < cmd.length && cmd[i] !== '"') {
        if (cmd[i] === '\\' && '"\\$`\n'.includes(cmd[i + 1] ?? '')) {
          if (cmd[i + 1] !== '\n') cur += cmd[i + 1];
          i += 2;
        } else cur += cmd[i++];
      }
      if (i >= cmd.length)
        throw bad('The cURL command has an unterminated quote');
      has = true;
      i++;
    } else if (/\s/.test(c)) {
      push();
      i++;
    } else {
      cur += c;
      has = true;
      i++;
    }
  }
  push();
  return out;
}

/** Options that take a value, by every spelling. */
const VALUE_OPTS: Record<string, string> = {
  '-X': 'method',
  '--request': 'method',
  '-H': 'header',
  '--header': 'header',
  '-d': 'data',
  '--data': 'data',
  '--data-ascii': 'data',
  '--data-raw': 'data-raw',
  '--data-binary': 'data',
  '--data-urlencode': 'data-urlencode',
  '-F': 'form',
  '--form': 'form',
  '--form-string': 'form-string',
  '-u': 'user',
  '--user': 'user',
  '--url': 'url',
  '-A': 'agent',
  '--user-agent': 'agent',
  '-e': 'referer',
  '--referer': 'referer',
  '-b': 'cookie',
  '--cookie': 'cookie',
  '-m': 'ignore',
  '--max-time': 'ignore',
  '--connect-timeout': 'ignore',
  '-o': 'ignore',
  '--output': 'ignore',
};

/** Options without a value that change nothing in a browser. */
const QUIET = new Set([
  '-s',
  '--silent',
  '-S',
  '--show-error',
  '-L',
  '--location',
  '--compressed',
  '-v',
  '--verbose',
  '-i',
  '--include',
  '-f',
  '--fail',
  '-g',
  '--globoff',
  '-sS',
  '-sL',
  '-Ls',
  '-sSL',
]);

const row = (
  key: string,
  value: string,
  extra: Partial<KvRow> = {},
): KvRow => ({
  id: newId(),
  enabled: true,
  key,
  value,
  ...extra,
});

/** `a=1&b=2` to rows (decoded), or null when it is not that shape. */
function pairs(text: string): [string, string][] | null {
  if (!text || !/^[^=&\s]+=[^&]*(&[^=&\s]+=[^&]*)*$/.test(text)) return null;
  try {
    return [...new URLSearchParams(text)];
  } catch {
    return null;
  }
}

export interface ParsedCurl {
  request: HttpRequest;
  /** Options that were ignored or need the user (choose a file). */
  warnings: string[];
}

/** Imports a pasted `curl ...` command into an editable request. */
export function parseCurl(cmd: string): ParsedCurl {
  const tokens = tokenize(cmd.trim());
  if (tokens[0] !== 'curl') throw bad('This is not a cURL command');
  const warnings: string[] = [];
  const req = emptyRequest();
  let method = '';
  let url = '';
  let getMode = false;
  const data: { text: string; encoded: boolean; raw: boolean }[] = [];
  const form: KvRow[] = [];

  for (let i = 1; i < tokens.length; i++) {
    let tok = tokens[i];
    let value: string | undefined;
    if (tok.startsWith('--') && tok.includes('=')) {
      const at = tok.indexOf('=');
      value = tok.slice(at + 1);
      tok = tok.slice(0, at);
    } else if (/^-[XHdFuAeb]./.test(tok)) {
      value = tok.slice(2);
      tok = tok.slice(0, 2);
    }
    if (!tok.startsWith('-') || tok === '-') {
      if (!url) url = tok;
      else warnings.push(`Ignored extra URL ${tok}`);
      continue;
    }
    const opt = VALUE_OPTS[tok];
    if (opt) {
      if (value === undefined) value = tokens[++i];
      if (value === undefined) throw bad(`Option ${tok} needs a value`);
      switch (opt) {
        case 'method':
          method = value.toUpperCase();
          break;
        case 'header': {
          const at = value.indexOf(':');
          if (at > 0)
            req.headers.push(
              row(value.slice(0, at).trim(), value.slice(at + 1).trim()),
            );
          else warnings.push(`Ignored header without a value: ${value}`);
          break;
        }
        case 'data':
        case 'data-raw':
          if (opt === 'data' && value.startsWith('@')) {
            warnings.push('Choose the file for the request body');
            req.body.kind = 'binary';
          } else data.push({ text: value, encoded: false, raw: true });
          break;
        case 'data-urlencode':
          data.push({ text: value, encoded: true, raw: false });
          break;
        case 'form':
        case 'form-string': {
          const at = value.indexOf('=');
          if (at <= 0) {
            warnings.push(`Ignored form field ${value}`);
            break;
          }
          const key = value.slice(0, at);
          const v = value.slice(at + 1);
          if (opt === 'form' && v.startsWith('@')) {
            form.push(row(key, v.slice(1).split(';')[0], { type: 'file' }));
            warnings.push(`Choose the file for ${key}`);
          } else form.push(row(key, opt === 'form' ? v.split(';type=')[0] : v));
          break;
        }
        case 'user': {
          const at = value.indexOf(':');
          req.auth = {
            kind: 'basic',
            user: at < 0 ? value : value.slice(0, at),
            pass: at < 0 ? '' : value.slice(at + 1),
          };
          break;
        }
        case 'url':
          url = value;
          break;
        case 'agent':
          req.headers.push(row('User-Agent', value));
          warnings.push('Browsers do not let a page set User-Agent');
          break;
        case 'referer':
          req.headers.push(row('Referer', value));
          break;
        case 'cookie':
          req.headers.push(row('Cookie', value));
          warnings.push('Browsers do not let a page set Cookie headers');
          break;
        case 'ignore':
          break;
      }
      continue;
    }
    if (tok === '-G' || tok === '--get') getMode = true;
    else if (tok === '-I' || tok === '--head') method = 'HEAD';
    else if (tok === '-k' || tok === '--insecure')
      warnings.push(
        'Certificate checks cannot be turned off in a browser (-k ignored)',
      );
    else if (!QUIET.has(tok)) warnings.push(`Ignored unknown option ${tok}`);
  }

  if (!url) throw bad('The cURL command has no URL');
  req.url = /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `http://${url}`;

  // --data-urlencode name=value encodes only the value part.
  const parts = data.map((d) => {
    if (!d.encoded) return d.text;
    const at = d.text.indexOf('=');
    if (at < 0) return encodeURIComponent(d.text);
    return `${d.text.slice(0, at)}=${encodeURIComponent(d.text.slice(at + 1))}`;
  });
  const joined = parts.join('&');

  if (getMode) {
    for (const [k, v] of pairs(joined) ?? []) req.params.push(row(k, v));
    req.method = method || 'GET';
  } else {
    if (form.length) {
      req.body.kind = 'form-data';
      req.body.form = form;
    } else if (data.length) {
      const ct =
        req.headers.find((h) => h.key.toLowerCase() === 'content-type')
          ?.value ?? '';
      const asPairs = pairs(joined);
      if (/json/i.test(ct)) {
        req.body.kind = 'json';
        req.body.text = joined;
      } else if (asPairs && (ct === '' || /x-www-form-urlencoded/i.test(ct))) {
        req.body.kind = 'urlencoded';
        req.body.form = asPairs.map(([k, v]) => row(k, v));
      } else {
        req.body.kind = 'raw';
        req.body.text = joined;
        req.body.contentType = ct || 'application/x-www-form-urlencoded';
      }
    }
    const hasBody =
      form.length > 0 || data.length > 0 || req.body.kind === 'binary';
    req.method = method || (hasBody ? 'POST' : 'GET');
  }
  return { request: req, warnings };
}
