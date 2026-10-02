import { CodecError, type Codec } from './codec';

const hex = (n: number, w: number) =>
  n.toString(16).toUpperCase().padStart(w, '0');

const JS_SHORT: Record<string, string> = {
  '\\': '\\\\',
  "'": "\\'",
  '"': '\\"',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\b': '\\b',
  '\f': '\\f',
  '\v': '\\v',
  '\0': '\\0',
};

const JS_UNESCAPE: Record<string, string> = {
  n: '\n',
  r: '\r',
  t: '\t',
  b: '\b',
  f: '\f',
  v: '\v',
  '0': '\0',
  "'": "'",
  '"': '"',
  '\\': '\\',
  '`': '`',
};

export const jsString: Codec = {
  id: 'js-string',
  label: 'JavaScript string',
  about:
    'Escapes text for a JavaScript string literal (without the quotes): backslash, both quotes, line breaks, tabs and other control characters, plus U+2028 and U+2029. Decoding reads \\n, \\xXX, \\uXXXX, \\u{...} and the rest.',
  encode: (s) => {
    let out = '';
    for (const ch of s) {
      const cp = ch.codePointAt(0)!;
      if (JS_SHORT[ch] !== undefined) out += JS_SHORT[ch];
      else if (cp < 0x20 || cp === 0x7f) out += `\\x${hex(cp, 2)}`;
      else if (cp === 0x2028 || cp === 0x2029) out += `\\u${hex(cp, 4)}`;
      else out += ch;
    }
    return out;
  },
  decode: (s) => {
    let out = '';
    for (let i = 0; i < s.length; i++) {
      if (s[i] !== '\\') {
        out += s[i];
        continue;
      }
      const at = i;
      const c = s[++i];
      if (c === undefined) throw new CodecError('Unfinished escape', at);
      if (JS_UNESCAPE[c] !== undefined) out += JS_UNESCAPE[c];
      else if (c === '\n') continue;
      else if (c === 'x') {
        const h = s.slice(i + 1, i + 3);
        if (!/^[0-9a-fA-F]{2}$/.test(h))
          throw new CodecError('Invalid \\x escape', at);
        out += String.fromCharCode(parseInt(h, 16));
        i += 2;
      } else if (c === 'u') {
        const braced = /^\{([0-9a-fA-F]{1,6})\}/.exec(s.slice(i + 1));
        const four = /^[0-9a-fA-F]{4}/.exec(s.slice(i + 1));
        const cp = braced
          ? parseInt(braced[1], 16)
          : four
            ? parseInt(four[0], 16)
            : NaN;
        if (!(cp <= 0x10ffff)) throw new CodecError('Invalid \\u escape', at);
        out += String.fromCodePoint(cp);
        i += braced ? braced[0].length : 4;
      } else out += c;
    }
    return out;
  },
};

export const jsonString: Codec = {
  id: 'json-string',
  label: 'JSON string',
  about:
    'Escapes text for a JSON string value (without the quotes), exactly as JSON.stringify does: quote, backslash and control characters. Decoding follows RFC 8259 strictly.',
  encode: (s) => JSON.stringify(s).slice(1, -1),
  decode: (s) => {
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      const code = ch.charCodeAt(0);
      if (code < 0x20)
        throw new CodecError('Control character must be escaped', i);
      if (ch === '"') throw new CodecError('Unescaped quote', i);
      if (ch !== '\\') {
        out += ch;
        continue;
      }
      const at = i;
      const c = s[++i];
      const simple: Record<string, string> = {
        '"': '"',
        '\\': '\\',
        '/': '/',
        b: '\b',
        f: '\f',
        n: '\n',
        r: '\r',
        t: '\t',
      };
      if (c !== undefined && simple[c] !== undefined) out += simple[c];
      else if (c === 'u' && /^[0-9a-fA-F]{4}$/.test(s.slice(i + 1, i + 5))) {
        out += String.fromCharCode(parseInt(s.slice(i + 1, i + 5), 16));
        i += 4;
      } else throw new CodecError('Invalid escape', at);
    }
    return out;
  },
};
