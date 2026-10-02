import { ToolError } from './errors';

/**
 * Punycode (RFC 3492) and IDN host helpers: the full codec (encode and
 * decode with error positions) shared by the URL Encoder/Decoder and the
 * URL Parser (plan G2-10). `toAsciiHost` goes through the URL parser, which
 * applies UTS 46 the way browsers do.
 */

const BASE = 36;
const TMIN = 1;
const TMAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 128;

/** A decode error at a 0-based offset; the message says it 1-based. */
export class PunycodeError extends ToolError {
  readonly position: number;
  /** The message without the position. */
  readonly reason: string;

  constructor(reason: string, position: number) {
    super('INVALID_INPUT', `${reason} at position ${position + 1}`);
    this.name = 'PunycodeError';
    this.position = position;
    this.reason = reason;
  }
}

const digitChar = (d: number) => String.fromCharCode(d < 26 ? 97 + d : 22 + d);

function digitValue(c: number): number {
  if (c >= 48 && c <= 57) return c - 22;
  if (c >= 65 && c <= 90) return c - 65;
  if (c >= 97 && c <= 122) return c - 97;
  return BASE;
}

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

const threshold = (k: number, bias: number) =>
  k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;

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
          const t = threshold(k, bias);
          if (q < t) break;
          out += digitChar(t + ((q - t) % (BASE - t)));
          q = Math.floor((q - t) / (BASE - t));
        }
        out += digitChar(q);
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

/**
 * Raw RFC 3492 decoding of one label (without `xn--`). Throws
 * PunycodeError; `offset` shifts its position (the label's place in a host).
 */
export function punycodeDecode(input: string, offset = 0): string {
  const dash = input.lastIndexOf('-');
  const out = Array.from(dash > 0 ? input.slice(0, dash) : '', (c) => {
    const cp = c.codePointAt(0)!;
    if (cp >= 0x80)
      throw new PunycodeError(
        'Punycode must be ASCII',
        offset + input.indexOf(c),
      );
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
        throw new PunycodeError('Punycode ends too early', offset + pos);
      const d = digitValue(input.charCodeAt(pos));
      if (d >= BASE)
        throw new PunycodeError(
          `Invalid Punycode digit "${input[pos]}"`,
          offset + pos,
        );
      pos++;
      i += d * w;
      const t = threshold(k, bias);
      if (d < t) break;
      w *= BASE - t;
      if (!Number.isSafeInteger(i) || !Number.isSafeInteger(w))
        throw new PunycodeError('Punycode number is too large', offset + pos);
    }
    bias = adapt(i - old, out.length + 1, old === 0);
    n += Math.floor(i / (out.length + 1));
    i %= out.length + 1;
    if (n > 0x10ffff)
      throw new PunycodeError(
        'Punycode decodes past the last code point',
        offset,
      );
    out.splice(i++, 0, n);
  }
  return String.fromCodePoint(...out);
}

// IDNA label separators: full stop, ideographic, fullwidth and halfwidth.
const DOTS = /[.\u3002\uff0e\uff61]/;

/**
 * Strict IDN to ASCII: each dot-separated label that is not ASCII becomes
 * `xn--` plus its Punycode (lower-cased and NFC first, as IDNA maps it).
 */
export function idnToAscii(host: string): string {
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

/** Strict IDN to Unicode: each `xn--` label decoded; a bad one throws. */
export function idnToUnicode(host: string): string {
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
