import { ToolError } from '@/shared/lib/errors';
import { emptyCurlRequest, headerValue, type CurlRequest } from './model';
import type { FormField } from './model';
import { IGNORE_TEXT, LONG, SHORT } from './options';
import { splitCommand, type ShellDialect } from './shell-words';

const bad = (message: string) => new ToolError('INVALID_INPUT', message);

/** An option the conversion leaves out, and why (shown in the UI). */
export interface IgnoredOption {
  option: string;
  value?: string;
  reason: string;
}

export interface ParsedCurl {
  request: CurlRequest;
  ignored: IgnoredOption[];
  /** Things converted with a caveat (a file to choose, a header dropped). */
  warnings: string[];
  dialect: ShellDialect;
}

type DataPart = { text: string } | { file: string };

/** Percent-encodes like curl: everything but letters, digits and `-._~`. */
export function curlEscape(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * `--data-urlencode` and `--url-query` content: `text`, `=text`,
 * `name=text`, `@file` or `name@file`.
 */
function urlencodePart(value: string): DataPart {
  const at = value.search(/[=@]/);
  if (at < 0) return { text: curlEscape(value) };
  const name = value.slice(0, at);
  const rest = value.slice(at + 1);
  if (value[at] === '@') return { file: rest };
  return { text: name ? `${name}=${curlEscape(rest)}` : curlEscape(rest) };
}

const isCurl = (w: string) => /^(.*[/\\])?curl(\.exe)?$/i.test(w);
const OPERATORS = new Set(['|', '||', '&&', ';', '&', '>', '>>', '<']);

/** A `-F` value: `name=text`, `name=@file;type=...;filename=...`, `name=<file`. */
export function formField(value: string, literal: boolean): FormField | null {
  const at = value.indexOf('=');
  if (at <= 0) return null;
  const name = value.slice(0, at);
  const rest = value.slice(at + 1);
  if (literal) return { name, value: rest };
  if (rest.startsWith('@') || rest.startsWith('<')) {
    const [path, ...attrs] = rest.slice(1).split(';');
    const field: FormField = { name, value: path, file: true };
    for (const a of attrs) {
      const eq = a.indexOf('=');
      const k = a.slice(0, eq).trim().toLowerCase();
      const v = a.slice(eq + 1).replace(/^"|"$/g, '');
      if (k === 'type') field.type = v;
      else if (k === 'filename') field.filename = v;
    }
    return field;
  }
  const typed = /^(.*);type=([^;]+)$/.exec(rest);
  return typed
    ? { name, value: typed[1], type: typed[2] }
    : { name, value: rest };
}

/** Parses a pasted `curl ...` command (bash or Windows cmd). */
export function parseCurl(text: string): ParsedCurl {
  const trimmed = text.trim().replace(/^[$>]\s+/, '');
  if (!trimmed) throw bad('Paste a curl command');
  const { words, dialect } = splitCommand(trimmed);
  if (!words.length || !isCurl(words[0]))
    throw bad('This is not a curl command: it should start with curl');

  const req = emptyCurlRequest();
  const ignored: IgnoredOption[] = [];
  const warnings: string[] = [];
  const data: DataPart[] = [];
  const query: string[] = [];
  const form: FormField[] = [];
  let method = '';
  let urls: string[] = [];
  let getMode = false;
  let headMode = false;
  let json = false;
  let upload = '';
  const cookies: string[] = [];

  const apply = (option: string, name: string, value: string) => {
    switch (LONG[name]?.handled) {
      case 'method':
        method = value;
        break;
      case 'header': {
        if (value.startsWith('@')) {
          ignored.push({
            option,
            value,
            reason: 'Reads headers from a file; left out',
          });
          break;
        }
        const colon = value.indexOf(':');
        const semi = value.indexOf(';');
        if (colon > 0) {
          const v = value.slice(colon + 1).trim();
          const n = value.slice(0, colon).trim();
          if (v) req.headers.push({ name: n, value: v });
          else
            warnings.push(
              `-H "${n}:" only removes a header curl adds itself; left out`,
            );
        } else if (semi > 0 && !value.slice(semi + 1).trim())
          req.headers.push({ name: value.slice(0, semi).trim(), value: '' });
        else
          ignored.push({ option, value, reason: 'Not a Name: value header' });
        break;
      }
      case 'data':
      case 'data-binary':
      case 'json':
        if (value.startsWith('@')) data.push({ file: value.slice(1) });
        else data.push({ text: value });
        if (LONG[name]?.handled === 'json') json = true;
        break;
      case 'data-raw':
        data.push({ text: value });
        break;
      case 'data-urlencode':
        data.push(urlencodePart(value));
        break;
      case 'form':
      case 'form-string': {
        const f = formField(value, name === 'form-string');
        if (f) form.push(f);
        else ignored.push({ option, value, reason: 'Not a name=value field' });
        break;
      }
      case 'user': {
        const at = value.indexOf(':');
        req.auth = {
          user: at < 0 ? value : value.slice(0, at),
          pass: at < 0 ? '' : value.slice(at + 1),
        };
        if (at < 0)
          warnings.push(
            '-u has no password: curl would ask for one; left empty',
          );
        break;
      }
      case 'cookie':
        if (value.includes('=')) cookies.push(value);
        else
          ignored.push({
            option,
            value,
            reason: 'Reads cookies from a file; left out',
          });
        break;
      case 'agent':
        req.headers.push({ name: 'User-Agent', value });
        break;
      case 'referer': {
        const ref = value.replace(/;auto$/, '');
        if (ref) req.headers.push({ name: 'Referer', value: ref });
        break;
      }
      case 'url':
        urls.push(value);
        break;
      case 'url-query':
        if (value.startsWith('+')) query.push(value.slice(1));
        else {
          const p = urlencodePart(value);
          if ('text' in p) query.push(p.text);
          else
            ignored.push({ option, value, reason: 'Reads a file; left out' });
        }
        break;
      case 'upload':
        upload = value;
        break;
      case 'bearer':
        req.headers.push({ name: 'Authorization', value: `Bearer ${value}` });
        break;
      case 'range':
        req.headers.push({ name: 'Range', value: `bytes=${value}` });
        break;
      case 'get':
        getMode = true;
        break;
      case 'head':
        headMode = true;
        break;
      case 'insecure':
        req.insecure = true;
        break;
      case 'location':
        req.location = true;
        break;
      case 'compressed':
        req.compressed = true;
        break;
      default: {
        const reason = LONG[name]?.ignore;
        ignored.push({
          option,
          value: value || undefined,
          reason: reason ? IGNORE_TEXT[reason] : 'Not recognised; left out',
        });
      }
    }
  };

  let i = 1;
  for (; i < words.length; i++) {
    const w = words[i];
    if (OPERATORS.has(w)) {
      warnings.push(
        `Only the first command is converted; everything from "${w}" on is left out`,
      );
      break;
    }
    if (w.startsWith('--') && w.length > 2) {
      let name = w.slice(2);
      let value: string | undefined;
      const eq = name.indexOf('=');
      if (eq > 0 && !LONG[name] && LONG[name.slice(0, eq)]) {
        value = name.slice(eq + 1);
        name = name.slice(0, eq);
      }
      const spec = LONG[name];
      if (
        !spec &&
        name.startsWith('no-') &&
        LONG[name.slice(3)]?.value === false
      ) {
        const base = name.slice(3);
        if (base === 'compressed') req.compressed = false;
        else if (base === 'insecure') req.insecure = false;
        else if (base === 'location') req.location = false;
        else
          ignored.push({ option: w, reason: 'Turns an option off; left out' });
        continue;
      }
      if (!spec) {
        ignored.push({ option: w, reason: 'Not recognised; left out' });
        continue;
      }
      if (spec.value && value === undefined) {
        value = words[++i];
        if (value === undefined) throw bad(`Option ${w} needs a value`);
      }
      apply(w, name, value ?? '');
      continue;
    }
    if (w.startsWith('-') && w.length > 1) {
      // A cluster of short options: -sSL, -XPOST, -sXPOST, -Hname:value.
      for (let j = 1; j < w.length; j++) {
        const long = SHORT[w[j]];
        const option = `-${w[j]}`;
        if (!long) {
          ignored.push({ option, reason: 'Not recognised; left out' });
          continue;
        }
        if (LONG[long].value) {
          let value = w.slice(j + 1);
          if (!value) {
            value = words[++i];
            if (value === undefined)
              throw bad(`Option ${option} needs a value`);
          }
          apply(option, long, value);
          break;
        }
        apply(option, long, '');
      }
      continue;
    }
    urls.push(w);
  }

  if (!urls.length) throw bad('The curl command has no URL');
  if (urls.length > 1) {
    for (const u of urls.slice(1))
      ignored.push({ option: u, reason: 'Only the first URL is converted' });
    urls = urls.slice(0, 1);
  }
  let url = urls[0];
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `http://${url}`;

  const texts = data.flatMap((d) => ('text' in d ? [d.text] : []));
  const files = data.flatMap((d) => ('file' in d ? [d.file] : []));
  if (files.includes('-'))
    warnings.push('The body is read from standard input (@-); left out');
  const realFiles = files.filter((f) => f !== '-');

  if (json) {
    if (headerValue(req.headers, 'content-type') === undefined)
      req.headers.push({ name: 'Content-Type', value: 'application/json' });
    if (headerValue(req.headers, 'accept') === undefined)
      req.headers.push({ name: 'Accept', value: 'application/json' });
  }
  if (cookies.length) req.cookie = cookies.join('; ');

  if (getMode) {
    query.push(...texts);
    if (realFiles.length)
      warnings.push(
        '-G with @file data: the file parts are left out of the URL',
      );
  } else if (upload) {
    req.body = { kind: 'file', path: upload, upload: true };
    if (data.length || form.length)
      warnings.push('-T uploads the file; the -d and -F data are left out');
  } else if (form.length) {
    req.body = { kind: 'form', fields: form };
    if (data.length)
      warnings.push('-F and -d together: the -d data is left out');
  } else if (realFiles.length && !texts.length) {
    req.body = { kind: 'file', path: realFiles[0], upload: false };
    if (realFiles.length > 1)
      warnings.push('Several @file bodies: only the first file is kept');
  } else if (texts.length) {
    req.body = { kind: 'data', text: texts.join('&') };
    if (realFiles.length)
      warnings.push(
        `The data read from ${realFiles.map((f) => `@${f}`).join(', ')} is left out; only the inline data is kept`,
      );
  }

  if (query.length) {
    const hash = url.indexOf('#');
    const frag = hash < 0 ? '' : url.slice(hash);
    const base = hash < 0 ? url : url.slice(0, hash);
    const sep = base.includes('?') ? (/[?&]$/.test(base) ? '' : '&') : '?';
    url = `${base}${sep}${query.join('&')}${frag}`;
  }
  req.url = url;

  req.method = method
    ? method
    : headMode
      ? 'HEAD'
      : getMode
        ? 'GET'
        : upload
          ? 'PUT'
          : req.body.kind !== 'none'
            ? 'POST'
            : 'GET';
  return { request: req, ignored, warnings, dialect };
}
