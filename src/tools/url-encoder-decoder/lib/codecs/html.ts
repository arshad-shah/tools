import { CodecError, type Codec } from './codec';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// Used where DOMParser is missing (workers, Node): the common names only.
const FALLBACK: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: String.fromCodePoint(0xa0),
  copy: String.fromCodePoint(0xa9),
  reg: String.fromCodePoint(0xae),
  eacute: String.fromCodePoint(0xe9),
  euro: String.fromCodePoint(0x20ac),
};

const named = new Map<string, string | null>();

/** A named entity through the browser's full HTML5 table (null: unknown). */
function lookupNamed(name: string): string | null {
  if (named.has(name)) return named.get(name)!;
  let value: string | null;
  if (typeof DOMParser === 'function') {
    const entity = `&${name};`;
    const text =
      new DOMParser().parseFromString(entity, 'text/html').body.textContent ??
      entity;
    value = text === entity ? null : text;
  } else value = FALLBACK[name] ?? null;
  named.set(name, value);
  return value;
}

const ENTITY = /&(#[xX][0-9a-fA-F]+|#[0-9]+|[A-Za-z][A-Za-z0-9]*);/g;

export function decodeEntities(s: string): string {
  return s.replace(ENTITY, (whole, body: string, at: number) => {
    if (body[0] !== '#') return lookupNamed(body) ?? whole;
    const hex = body[1] === 'x' || body[1] === 'X';
    const cp = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
    if (!(cp > 0 && cp <= 0x10ffff) || (cp >= 0xd800 && cp <= 0xdfff))
      throw new CodecError(`Invalid character reference "${whole}"`, at);
    return String.fromCodePoint(cp);
  });
}

export const html: Codec = {
  id: 'html',
  label: 'HTML entities',
  about:
    'Escapes & < > " and \' so text is safe inside HTML, and writes characters outside ASCII as hex references (&#xE9;). Decoding reads named (&eacute;), decimal (&#233;) and hex (&#xE9;) references using the full HTML5 table.',
  encode: (s) => {
    let out = '';
    for (const ch of s) {
      const cp = ch.codePointAt(0)!;
      out +=
        ESCAPES[ch] ??
        (cp > 0x7e ? `&#x${cp.toString(16).toUpperCase()};` : ch);
    }
    return out;
  },
  decode: decodeEntities,
};
