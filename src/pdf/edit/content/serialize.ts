import { fromLatin1, isRegular, type ParsedContent, type Tok } from './tokens';

/** Fixed notation, at most 6 decimals, never an exponent, no "-0". */
export function formatNumber(v: number): string {
  if (!Number.isFinite(v)) return '0';
  if (Number.isInteger(v)) return Object.is(v, -0) ? '0' : String(v);
  let s = v.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s;
}

const HEX = '0123456789ABCDEF';
const hex = (b: number) => HEX[b >> 4] + HEX[b & 15];

function nameText(v: string): string {
  let out = '/';
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i) & 0xff;
    out +=
      c > 0x20 && c < 0x7f && c !== 0x23 && isRegular(c)
        ? String.fromCharCode(c)
        : `#${hex(c)}`;
  }
  return out;
}

/**
 * Canonical text of one token: numbers fixed, strings as hex `<..>`, names
 * with `#xx` escapes for delimiters and non-regular bytes.
 */
export function serializeTok(t: Tok): string {
  switch (t.t) {
    case 'num':
      return formatNumber(t.v);
    case 'str': {
      let s = '<';
      for (const b of t.v) s += hex(b);
      return `${s}>`;
    }
    case 'name':
      return nameText(t.v);
    case 'arr':
      return `[${t.v.map(serializeTok).join(' ')}]`;
    case 'dict': {
      const parts: string[] = [];
      for (const [k, v] of t.v) parts.push(`${nameText(k)} ${serializeTok(v)}`);
      return `<<${parts.join(' ')}>>`;
    }
    case 'bool':
      return t.v ? 'true' : 'false';
    case 'null':
      return 'null';
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const c of chunks) n += c.length;
  const out = new Uint8Array(n);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** Unmodified ops verbatim; modified ops canonical (" " + operands + " " + op + "\n"). */
export function serializeContent(p: ParsedContent): Uint8Array {
  const chunks: Uint8Array[] = [];
  for (const op of p.ops) {
    if (op.raw) {
      chunks.push(op.raw);
      continue;
    }
    if (op.op === 'BI' && op.inline) {
      const pairs = [...op.inline.dict]
        .map(([k, v]) => `${nameText(k)} ${serializeTok(v)}`)
        .join(' ');
      chunks.push(
        fromLatin1(` BI ${pairs} ID `),
        op.inline.data,
        fromLatin1('\nEI\n'),
      );
      continue;
    }
    const operands = op.operands.map(serializeTok).join(' ');
    chunks.push(
      fromLatin1(operands ? ` ${operands} ${op.op}\n` : ` ${op.op}\n`),
    );
  }
  chunks.push(p.tail);
  return concat(chunks);
}
