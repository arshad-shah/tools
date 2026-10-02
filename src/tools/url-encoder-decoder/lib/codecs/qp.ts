import { utf8Encode } from '@/shared/lib/encoding';
import { CodecError, decodeUtf8At, type Codec } from './codec';

const MAX = 76;

const esc = (b: number) => '=' + b.toString(16).toUpperCase().padStart(2, '0');

function encodeLine(line: string): string {
  const bytes = utf8Encode(line);
  const tokens: string[] = [];
  bytes.forEach((b, i) => {
    const last = i === bytes.length - 1;
    const literal =
      (b >= 33 && b <= 126 && b !== 61) || ((b === 32 || b === 9) && !last);
    tokens.push(literal ? String.fromCharCode(b) : esc(b));
  });
  // Soft line breaks: at most 75 characters plus "=" per physical line,
  // never inside an =XX escape.
  const out: string[] = [];
  let cur = '';
  tokens.forEach((t, i) => {
    const room = i === tokens.length - 1 ? MAX : MAX - 1;
    if (cur.length + t.length > room) {
      out.push(cur + '=');
      cur = '';
    }
    cur += t;
  });
  out.push(cur);
  return out.join('\n');
}

export function decodeQuotedPrintable(s: string): string {
  const bytes: number[] = [];
  const positions: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '=') {
      const soft = /^=[ \t]*\r?\n/.exec(s.slice(i));
      if (soft) {
        i += soft[0].length - 1;
        continue;
      }
      const pair = s.slice(i + 1, i + 3);
      if (!/^[0-9A-Fa-f]{2}$/.test(pair))
        throw new CodecError(`Invalid escape "=${pair}"`, i);
      bytes.push(parseInt(pair, 16));
      positions.push(i);
      i += 2;
      continue;
    }
    // Trailing whitespace on a line was added in transport (RFC 2045).
    if ((ch === ' ' || ch === '\t') && /^[ \t]*(\r?\n|$)/.test(s.slice(i)))
      continue;
    for (const b of utf8Encode(ch)) {
      bytes.push(b);
      positions.push(i);
    }
  }
  return decodeUtf8At(bytes, positions, 'quoted-printable sequence');
}

export const quotedPrintable: Codec = {
  id: 'quoted-printable',
  label: 'Quoted-printable',
  about:
    'MIME quoted-printable (RFC 2045): printable ASCII stays as it is, other UTF-8 bytes become =XX, and lines longer than 76 characters get a soft break (= at the end of the line).',
  encode: (s) => s.split(/\r?\n/).map(encodeLine).join('\n'),
  decode: decodeQuotedPrintable,
};
