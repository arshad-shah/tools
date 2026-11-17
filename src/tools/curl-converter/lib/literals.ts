/** String literals and shell words for each output language. */

const hex = (c: string, width: number) =>
  c.charCodeAt(0).toString(16).padStart(width, '0');

/** A POSIX shell word: bare when safe, else single-quoted. */
export function shQuote(s: string): string {
  if (/^[A-Za-z0-9_\-.,:/@%+=]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

const COMMON: Record<string, string> = {
  '\\': '\\\\',
  "'": "\\'",
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};

/** Escapes `s` for a single-quoted literal; `other` escapes the rest it must. */
function escape(s: string, other: (c: string) => string | null): string {
  let out = '';
  for (const c of s) out += COMMON[c] ?? other(c) ?? c;
  return out;
}

/** A JavaScript single-quoted string. */
export function jsString(s: string): string {
  return `'${escape(s, (c) => {
    const code = c.charCodeAt(0);
    return code < 0x20 || code === 0x7f || code === 0x2028 || code === 0x2029
      ? `\\u${hex(c, 4)}`
      : null;
  })}'`;
}

/** A Python single-quoted string. */
export function pyString(s: string): string {
  return `'${escape(s, (c) => {
    const code = c.charCodeAt(0);
    return code < 0x20 || code === 0x7f ? `\\x${hex(c, 2)}` : null;
  })}'`;
}

/** A Go string: a raw backquoted one for multi-line or quoted text when possible. */
export function goString(s: string): string {
  if (/[\n"\\]/.test(s) && !/[`\r]/.test(s)) return `\`${s}\``;
  return JSON.stringify(s);
}

/** A PHP single-quoted string (only `\\` and `\'` are escapes). */
export function phpString(s: string): string {
  return `'${s.replace(/[\\']/g, (c) => `\\${c}`)}'`;
}

/** A JavaScript object key: bare when it is an identifier. */
export function jsKey(s: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(s) ? s : jsString(s);
}

/** A JSON value as a Python literal (True, False, None), indented. */
export function pyLiteral(v: unknown, indent = 0): string {
  const pad = '    '.repeat(indent + 1);
  const end = '    '.repeat(indent);
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return pyString(v);
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    const flat = v.map((x) => pyLiteral(x, indent + 1));
    if (v.every((x) => typeof x !== 'object' || x === null)) {
      const line = `[${flat.join(', ')}]`;
      if (line.length <= 60) return line;
    }
    return `[\n${flat.map((x) => `${pad}${x},`).join('\n')}\n${end}]`;
  }
  const entries = Object.entries(v as Record<string, unknown>);
  if (!entries.length) return '{}';
  return `{\n${entries
    .map(([k, x]) => `${pad}${pyString(k)}: ${pyLiteral(x, indent + 1)},`)
    .join('\n')}\n${end}}`;
}

/** A JSON value as a JavaScript literal, indented by `indent` levels of two. */
export function jsLiteral(v: unknown, indent = 0): string {
  const pad = '  '.repeat(indent + 1);
  const end = '  '.repeat(indent);
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return jsString(v);
  if (typeof v !== 'object') return String(v);
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    const flat = v.map((x) => jsLiteral(x, indent + 1));
    if (v.every((x) => typeof x !== 'object' || x === null)) {
      const line = `[${flat.join(', ')}]`;
      if (line.length <= 60) return line;
    }
    return `[\n${flat.map((x) => `${pad}${x},`).join('\n')}\n${end}]`;
  }
  const entries = Object.entries(v as Record<string, unknown>);
  if (!entries.length) return '{}';
  return `{\n${entries
    .map(([k, x]) => `${pad}${jsKey(k)}: ${jsLiteral(x, indent + 1)},`)
    .join('\n')}\n${end}}`;
}
