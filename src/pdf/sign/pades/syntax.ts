/*
 * A minimal reader for the PDF object syntax a trailer or cross-reference
 * stream dictionary uses (ISO 32000-1 §7.3): numbers, names, strings,
 * arrays, dictionaries, booleans, null and indirect references. Enough for
 * the signing code to read trailers and signature dictionaries without
 * loading the whole file.
 */

export type PdfValue =
  | { t: 'num'; v: number }
  | { t: 'name'; v: string }
  | { t: 'str'; v: Uint8Array; hex: boolean }
  | { t: 'arr'; v: PdfValue[] }
  | { t: 'dict'; v: Map<string, PdfValue> }
  | { t: 'ref'; num: number; gen: number }
  | { t: 'bool'; v: boolean }
  | { t: 'null' };

export class PdfSyntaxError extends Error {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(message);
    this.name = 'PdfSyntaxError';
  }
}

const isWs = (c: number) =>
  c === 0x20 || c === 0x0a || c === 0x0d || c === 0x09 || c === 0x0c || c === 0;
const isDelim = (c: number) =>
  c === 0x28 ||
  c === 0x29 ||
  c === 0x3c ||
  c === 0x3e ||
  c === 0x5b ||
  c === 0x5d ||
  c === 0x7b ||
  c === 0x7d ||
  c === 0x2f ||
  c === 0x25;

export function skipWs(b: Uint8Array, i: number): number {
  while (i < b.length) {
    if (isWs(b[i])) i++;
    else if (b[i] === 0x25)
      while (i < b.length && b[i] !== 0x0a && b[i] !== 0x0d) i++;
    else break;
  }
  return i;
}

function readWord(b: Uint8Array, i: number): [string, number] {
  let j = i;
  while (j < b.length && !isWs(b[j]) && !isDelim(b[j])) j++;
  return [String.fromCharCode(...b.subarray(i, j)), j];
}

const hexVal = (c: number) =>
  c >= 0x30 && c <= 0x39
    ? c - 0x30
    : c >= 0x41 && c <= 0x46
      ? c - 0x37
      : c >= 0x61 && c <= 0x66
        ? c - 0x57
        : -1;

function readHex(b: Uint8Array, start: number): [PdfValue, number] {
  const out: number[] = [];
  let hi = -1;
  let i = start + 1;
  for (; i < b.length && b[i] !== 0x3e; i++) {
    const h = hexVal(b[i]);
    if (h < 0) {
      if (isWs(b[i])) continue;
      throw new PdfSyntaxError('Bad hex string', i);
    }
    if (hi < 0) hi = h;
    else {
      out.push(hi * 16 + h);
      hi = -1;
    }
  }
  if (i >= b.length)
    throw new PdfSyntaxError('A hex string is not closed', start);
  if (hi >= 0) out.push(hi * 16);
  return [{ t: 'str', v: Uint8Array.from(out), hex: true }, i + 1];
}

const ESC: Record<number, number> = {
  0x6e: 0x0a,
  0x72: 0x0d,
  0x74: 0x09,
  0x62: 0x08,
  0x66: 0x0c,
};

function readLiteral(b: Uint8Array, start: number): [PdfValue, number] {
  const out: number[] = [];
  let depth = 1;
  let i = start + 1;
  while (i < b.length) {
    const c = b[i++];
    if (c === 0x5c) {
      const e = b[i++];
      if (ESC[e] !== undefined) out.push(ESC[e]);
      else if (e >= 0x30 && e <= 0x37) {
        let v = e - 0x30;
        for (let k = 0; k < 2 && b[i] >= 0x30 && b[i] <= 0x37; k++)
          v = v * 8 + (b[i++] - 0x30);
        out.push(v & 0xff);
      } else if (e === 0x0d) {
        if (b[i] === 0x0a) i++;
      } else if (e !== 0x0a) out.push(e);
    } else if (c === 0x28) {
      depth++;
      out.push(c);
    } else if (c === 0x29) {
      if (--depth === 0)
        return [{ t: 'str', v: Uint8Array.from(out), hex: false }, i];
      out.push(c);
    } else out.push(c);
  }
  throw new PdfSyntaxError('A string is not closed', start);
}

function readName(b: Uint8Array, start: number): [PdfValue, number] {
  let i = start + 1;
  let s = '';
  while (i < b.length && !isWs(b[i]) && !isDelim(b[i])) {
    if (b[i] === 0x23 && hexVal(b[i + 1]) >= 0 && hexVal(b[i + 2]) >= 0) {
      s += String.fromCharCode(hexVal(b[i + 1]) * 16 + hexVal(b[i + 2]));
      i += 3;
    } else s += String.fromCharCode(b[i++]);
  }
  return [{ t: 'name', v: s }, i];
}

/** Reads one value at `i` (white space skipped first); returns it and the offset after it. */
export function readValue(b: Uint8Array, i: number): [PdfValue, number] {
  i = skipWs(b, i);
  if (i >= b.length) throw new PdfSyntaxError('Unexpected end of file', i);
  const c = b[i];
  if (c === 0x2f) return readName(b, i);
  if (c === 0x28) return readLiteral(b, i);
  if (c === 0x3c) {
    if (b[i + 1] !== 0x3c) return readHex(b, i);
    const v = new Map<string, PdfValue>();
    let j = i + 2;
    for (;;) {
      j = skipWs(b, j);
      if (b[j] === 0x3e && b[j + 1] === 0x3e) return [{ t: 'dict', v }, j + 2];
      const [key, k] = readValue(b, j);
      if (key.t !== 'name') throw new PdfSyntaxError('Expected a name key', j);
      const [val, next] = readValue(b, k);
      v.set(key.v, val);
      j = next;
    }
  }
  if (c === 0x5b) {
    const v: PdfValue[] = [];
    let j = i + 1;
    for (;;) {
      j = skipWs(b, j);
      if (b[j] === 0x5d) return [{ t: 'arr', v }, j + 1];
      const [val, next] = readValue(b, j);
      v.push(val);
      j = next;
    }
  }
  const [word, end] = readWord(b, i);
  if (word === 'true' || word === 'false')
    return [{ t: 'bool', v: word === 'true' }, end];
  if (word === 'null') return [{ t: 'null' }, end];
  const n = Number(word);
  if (word === '' || !Number.isFinite(n))
    throw new PdfSyntaxError(
      `Unexpected token ${word || String.fromCharCode(c)}`,
      i,
    );
  // "num gen R" is a reference when two non-negative integers precede R.
  if (Number.isInteger(n) && n >= 0) {
    const j = skipWs(b, end);
    const [w2, e2] = readWord(b, j);
    if (/^\d+$/.test(w2)) {
      const k = skipWs(b, e2);
      if (
        b[k] === 0x52 &&
        (k + 1 >= b.length || isWs(b[k + 1]) || isDelim(b[k + 1]))
      )
        return [{ t: 'ref', num: n, gen: Number(w2) }, k + 1];
    }
  }
  return [{ t: 'num', v: n }, end];
}

/** Index of the last occurrence of `needle` in `b` at or before `from`. */
export function lastIndexOf(
  b: Uint8Array,
  needle: string,
  from = b.length,
): number {
  const n = needle.length;
  outer: for (let i = Math.min(from, b.length - n); i >= 0; i--) {
    for (let k = 0; k < n; k++)
      if (b[i + k] !== needle.charCodeAt(k)) continue outer;
    return i;
  }
  return -1;
}

/** Index of the first occurrence of `needle` in `b` at or after `from`. */
export function indexOf(b: Uint8Array, needle: string, from = 0): number {
  const n = needle.length;
  outer: for (let i = Math.max(0, from); i <= b.length - n; i++) {
    for (let k = 0; k < n; k++)
      if (b[i + k] !== needle.charCodeAt(k)) continue outer;
    return i;
  }
  return -1;
}

export const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export const toHex = (b: Uint8Array) =>
  Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

export function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  const out = new Uint8Array(clean.length >> 1);
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}
