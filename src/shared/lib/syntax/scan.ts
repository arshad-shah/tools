import type { Token, TokenKind } from './types';

/** Character tests by code unit (no regex over whole lines). */
export const isDigit = (c: number) => c >= 48 && c <= 57;
export const isAlpha = (c: number) =>
  (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
export const isIdStart = (c: number) =>
  isAlpha(c) || c === 95 || c === 36 || c > 127;
export const isIdPart = (c: number) => isIdStart(c) || isDigit(c);
export const isSpace = (c: number) =>
  c === 32 || c === 9 || c === 13 || c === 12;

/** Collects tokens for one line. */
export class Out {
  readonly tokens: Token[] = [];
  push(start: number, end: number, kind: TokenKind): void {
    if (end > start) this.tokens.push({ start, end, kind });
  }
}

export function skipSpace(line: string, i: number): number {
  while (i < line.length && isSpace(line.charCodeAt(i))) i++;
  return i;
}

export function readIdent(line: string, i: number): number {
  while (i < line.length && isIdPart(line.charCodeAt(i))) i++;
  return i;
}

/**
 * A quoted run from the opening quote at `i`: the index after the closing
 * quote, or the line end when it stays open. Backslash escapes unless
 * `doubled`, where the quote is escaped by doubling it (SQL, CSV).
 */
export function readQuoted(
  line: string,
  i: number,
  quote: number,
  doubled = false,
): { end: number; closed: boolean } {
  let j = i + 1;
  while (j < line.length) {
    const c = line.charCodeAt(j);
    if (!doubled && c === 92) j += 2;
    else if (c === quote) {
      if (doubled && line.charCodeAt(j + 1) === quote) j += 2;
      else return { end: j + 1, closed: true };
    } else j++;
  }
  return { end: line.length, closed: false };
}

/** Continues an open quoted run at the start of a line (no opening quote). */
export function continueQuoted(
  line: string,
  quote: number,
  doubled = false,
): { end: number; closed: boolean } {
  return readQuoted(line, -1, quote, doubled);
}

/** Decimal, hex, binary or octal numbers with `_`, fraction and exponent. */
export function readNumber(line: string, i: number): number {
  let j = i;
  if (line.charCodeAt(j) === 48 && /[xXbBoO]/.test(line[j + 1] ?? '')) {
    j += 2;
    while (j < line.length && /[0-9a-fA-F_]/.test(line[j])) j++;
    return line[j] === 'n' ? j + 1 : j;
  }
  while (j < line.length && (isDigit(line.charCodeAt(j)) || line[j] === '_'))
    j++;
  if (line[j] === '.' && isDigit(line.charCodeAt(j + 1) || 0)) {
    j++;
    while (j < line.length && (isDigit(line.charCodeAt(j)) || line[j] === '_'))
      j++;
  }
  if (
    (line[j] === 'e' || line[j] === 'E') &&
    /[0-9+-]/.test(line[j + 1] ?? '')
  ) {
    j += 2;
    while (j < line.length && isDigit(line.charCodeAt(j))) j++;
  }
  return line[j] === 'n' ? j + 1 : j;
}

/** Index of `needle` from `i`, or -1. */
export const find = (line: string, needle: string, i: number) =>
  line.indexOf(needle, i);
