import { ToolError } from './errors';

/**
 * Minimal IDN helpers (RFC 3492 decoding; encoding through the URL parser,
 * which applies UTS 46). Part 6-E has a full codec; whichever Part merges
 * second moves it here (plan G2-10).
 */

const BASE = 36;
const TMIN = 1;
const TMAX = 26;
const SKEW = 38;
const DAMP = 700;

function adapt(delta: number, points: number, first: boolean): number {
  let d = first ? Math.floor(delta / DAMP) : delta >> 1;
  d += Math.floor(d / points);
  let k = 0;
  while (d > ((BASE - TMIN) * TMAX) >> 1) {
    d = Math.floor(d / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - TMIN + 1) * d) / (d + SKEW));
}

function digitValue(c: number): number {
  if (c >= 48 && c <= 57) return c - 22;
  if (c >= 65 && c <= 90) return c - 65;
  if (c >= 97 && c <= 122) return c - 97;
  return BASE;
}

const bad = () => new ToolError('INVALID_INPUT', 'Not a valid punycode label');

/** Decodes one raw punycode label (without `xn--`). */
export function punycodeDecode(input: string): string {
  const out: number[] = [];
  const dash = input.lastIndexOf('-');
  for (let j = 0; j < Math.max(dash, 0); j++) {
    const c = input.charCodeAt(j);
    if (c >= 0x80) throw bad();
    out.push(c);
  }
  let n = 128;
  let i = 0;
  let bias = 72;
  for (let pos = dash > 0 ? dash + 1 : 0; pos < input.length; ) {
    const oldi = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      if (pos >= input.length) throw bad();
      const digit = digitValue(input.charCodeAt(pos++));
      if (digit >= BASE) throw bad();
      i += digit * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (digit < t) break;
      w *= BASE - t;
      if (!Number.isSafeInteger(i) || !Number.isSafeInteger(w)) throw bad();
    }
    bias = adapt(i - oldi, out.length + 1, oldi === 0);
    n += Math.floor(i / (out.length + 1));
    i %= out.length + 1;
    if (n > 0x10ffff) throw bad();
    out.splice(i++, 0, n);
  }
  return String.fromCodePoint(...out);
}

/** A hostname with `xn--` labels shown in Unicode (bad labels kept). */
export function toUnicodeHost(host: string): string {
  return host
    .split('.')
    .map((label) => {
      if (!/^xn--/i.test(label)) return label;
      try {
        return punycodeDecode(label.slice(4));
      } catch {
        return label;
      }
    })
    .join('.');
}

/** A hostname in ASCII (punycode) form, as browsers send it. */
export function toAsciiHost(host: string): string {
  if (/^[\x20-\x7e]*$/.test(host)) return host.toLowerCase();
  try {
    return new URL(`http://${host}/`).hostname;
  } catch (cause) {
    throw new ToolError('INVALID_INPUT', `Not a valid host name: ${host}`, {
      cause,
    });
  }
}
