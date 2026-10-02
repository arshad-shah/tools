import { CodecError, type Codec } from './codec';

// RFC 3492 parameters.
const BASE = 36;
const TMIN = 1;
const TMAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 128;

const digit = (d: number) => String.fromCharCode(d < 26 ? 97 + d : 22 + d);

function basic(cp: number): number {
  if (cp >= 48 && cp <= 57) return cp - 22;
  if (cp >= 65 && cp <= 90) return cp - 65;
  if (cp >= 97 && cp <= 122) return cp - 97;
  return BASE;
}

function adapt(delta: number, points: number, first: boolean): number {
  delta = first ? Math.floor(delta / DAMP) : delta >> 1;
  delta += Math.floor(delta / points);
  let k = 0;
  while (delta > ((BASE - TMIN) * TMAX) >> 1) {
    delta = Math.floor(delta / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW));
}

/** Raw RFC 3492 encoding of one label (no `xn--`, case kept). */
export function punycodeEncode(input: string): string {
  const cps = Array.from(input, (c) => c.codePointAt(0)!);
  let out = cps
    .filter((c) => c < 0x80)
    .map((c) => String.fromCharCode(c))
    .join('');
  const b = out.length;
  let h = b;
  if (b > 0) out += '-';
  let n = INITIAL_N;
  let delta = 0;
  let bias = INITIAL_BIAS;
  while (h < cps.length) {
    const m = Math.min(...cps.filter((c) => c >= n));
    delta += (m - n) * (h + 1);
    n = m;
    for (const c of cps) {
      if (c < n) delta++;
      if (c === n) {
        let q = delta;
        for (let k = BASE; ; k += BASE) {
          const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
          if (q < t) break;
          out += digit(t + ((q - t) % (BASE - t)));
          q = Math.floor((q - t) / (BASE - t));
        }
        out += digit(q);
        bias = adapt(delta, h + 1, h === b);
        delta = 0;
        h++;
      }
    }
    delta++;
    n++;
  }
  return out;
}

/** Raw RFC 3492 decoding of one label; `offset` shifts error positions. */
export function punycodeDecode(input: string, offset = 0): string {
  const dash = input.lastIndexOf('-');
  const out = Array.from(dash > 0 ? input.slice(0, dash) : '', (c) => {
    const cp = c.codePointAt(0)!;
    if (cp >= 0x80)
      throw new CodecError('Punycode must be ASCII', offset + input.indexOf(c));
    return cp;
  });
  let n = INITIAL_N;
  let bias = INITIAL_BIAS;
  let i = 0;
  for (let pos = dash > 0 ? dash + 1 : 0; pos < input.length; ) {
    const old = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      if (pos >= input.length)
        throw new CodecError('Punycode ends too early', offset + pos);
      const d = basic(input.charCodeAt(pos));
      if (d >= BASE)
        throw new CodecError(
          `Invalid Punycode digit "${input[pos]}"`,
          offset + pos,
        );
      pos++;
      i += d * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (d < t) break;
      w *= BASE - t;
    }
    bias = adapt(i - old, out.length + 1, old === 0);
    n += Math.floor(i / (out.length + 1));
    i %= out.length + 1;
    if (n > 0x10ffff)
      throw new CodecError('Punycode decodes past the last code point', offset);
    out.splice(i++, 0, n);
  }
  return String.fromCodePoint(...out);
}

// IDNA label separators: full stop, ideographic, fullwidth and halfwidth.
const DOTS = /[.\u3002\uff0e\uff61]/;

/**
 * Hostname-aware IDN: each dot-separated label that is not ASCII becomes
 * `xn--` plus its Punycode (lower-cased and NFC first, as IDNA maps it).
 */
export function toAscii(host: string): string {
  return host
    .split(DOTS)
    .map((label) =>
      // eslint-disable-next-line no-control-regex
      /^[\x00-\x7f]*$/.test(label)
        ? label
        : `xn--${punycodeEncode(label.normalize('NFC').toLowerCase())}`,
    )
    .join('.');
}

/** Each `xn--` label back to Unicode; others are kept. */
export function toUnicode(host: string): string {
  let offset = 0;
  return host
    .split('.')
    .map((label) => {
      const at = offset;
      offset += label.length + 1;
      return /^xn--/i.test(label)
        ? punycodeDecode(label.slice(4), at + 4)
        : label;
    })
    .join('.');
}

export const punycode: Codec = {
  id: 'punycode',
  label: 'Punycode (IDN)',
  about:
    'Internationalised domain names (RFC 3492): each label of a host name that is not plain ASCII is written as xn-- followed by its Punycode, and the dots are kept. bücher.example becomes xn--bcher-kva.example.',
  encode: toAscii,
  decode: toUnicode,
};
