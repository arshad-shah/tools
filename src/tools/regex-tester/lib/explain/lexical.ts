import { ToolError } from '@/shared/lib/errors';

/** Lexical helpers and engine feature checks for the regex parser. */

export const supports = (source: string, flags = ''): boolean => {
  try {
    new RegExp(source, flags);
    return true;
  } catch {
    return false;
  }
};
/** Engine features that vary by browser: follow the running engine. */
export const MODIFIERS = supports('(?i:a)');
export const DUPLICATE_NAMES = supports('(?<a>x)|(?<a>y)');

export const ID_START = /[\p{ID_Start}$_]/u;
export const ID_CONTINUE = /[\p{ID_Continue}$‌‍]/u;
export const SYNTAX = '^$\\.*+?()[]{}|/';
export const CLASS_SET_SYNTAX = '()[]{}/-\\|';
export const RESERVED_DOUBLE = '&!#$%*+,.:;<=>?@^`~';
export const CLASS_SET_RESERVED_PUNCT = '&-!#%,:;<=>@`~';
export const CONTROL: Record<string, string> = {
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  v: '\v',
};

export const isDigit = (c: string | undefined) =>
  c !== undefined && c >= '0' && c <= '9';
export const isOctal = (c: string | undefined) =>
  c !== undefined && c >= '0' && c <= '7';
export const isHex = (c: string | undefined) =>
  c !== undefined && /^[0-9a-fA-F]$/.test(c);
export const isLetter = (c: string | undefined) =>
  c !== undefined && /^[A-Za-z]$/.test(c);

export const validProperty = (
  body: string,
  flag: 'u' | 'v',
  negated: boolean,
) => supports(`\\${negated ? 'P' : 'p'}{${body}}`, flag);

export function validateFlags(flags: string): void {
  const seen = new Set<string>();
  for (let i = 0; i < flags.length; i++) {
    const f = flags[i];
    if (!'dgimsuvy'.includes(f) || seen.has(f))
      throw new ToolError('INVALID_INPUT', `Invalid flags: ${flags}`);
    seen.add(f);
  }
  if (seen.has('u') && seen.has('v'))
    throw new ToolError(
      'INVALID_INPUT',
      'The u and v flags cannot be combined',
    );
}

/** Counts capturing groups and collects names ahead of parsing. */
export function prescan(src: string, v: boolean) {
  let count = 0;
  const names: string[] = [];
  let depth = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') {
      i++;
    } else if (c === '[') {
      depth = v ? depth + 1 : 1;
    } else if (c === ']') {
      if (depth > 0) depth--;
    } else if (depth === 0 && c === '(') {
      if (src[i + 1] !== '?') count++;
      else if (src[i + 2] === '<' && src[i + 3] !== '=' && src[i + 3] !== '!') {
        count++;
        const close = src.indexOf('>', i + 3);
        if (close !== -1) names.push(src.slice(i + 3, close));
      }
    }
  }
  return { count, names };
}
