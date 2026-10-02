import type { CharNode, EscapeClassKind, PropertyNode, RegexNode } from './ast';
import type { Cursor } from './cursor';
import {
  CONTROL,
  SYNTAX,
  isDigit,
  isHex,
  isLetter,
  isOctal,
  validProperty,
} from './lexical';

// Escape parsers (atoms and classes), cursor-based.

/** `\p{...}` or `\P{...}` with the cursor on the `p`. */
export function property(p: Cursor, start: number): PropertyNode {
  const negated = p.peek() === 'P';
  p.pos++;
  const m = /^\{([A-Za-z_]+)(?:=([A-Za-z0-9_]+))?\}/.exec(p.src.slice(p.pos));
  if (!m || !validProperty(m[0].slice(1, -1), p.v ? 'v' : 'u', negated))
    p.fail('Invalid property name', start);
  p.pos += m[0].length;
  return {
    type: 'property',
    negated,
    name: m[1],
    value: m[2],
    start,
    end: p.pos,
  };
}

/** Character escapes shared by atoms and classes; cursor after `\`. */
export function characterEscape(
  p: Cursor,
  start: number,
  inClass: boolean,
): CharNode {
  const c = p.peek();
  const char = (value: string): CharNode => ({
    type: 'char',
    value,
    start,
    end: p.pos,
  });
  if (c === undefined) p.fail('\\ at end of pattern', start);
  if (CONTROL[c]) {
    p.pos++;
    return char(CONTROL[c]);
  }
  if (c === 'c') {
    const l = p.peek(1);
    if (isLetter(l) || (inClass && !p.u && (isDigit(l) || l === '_'))) {
      p.pos += 2;
      return char(String.fromCharCode(l!.charCodeAt(0) % 32));
    }
    if (p.u) p.fail('Invalid unicode escape', start);
    // Annex B: a lone backslash; the `c` is read again as a literal.
    return char('\\');
  }
  if (c === '0' && !isDigit(p.peek(1))) {
    p.pos++;
    return char('\0');
  }
  if (isDigit(c)) {
    if (p.u) p.fail('Invalid escape', start);
    if (c === '8' || c === '9') {
      p.pos++;
      return char(c);
    }
    let digits = c;
    p.pos++;
    const limit = c <= '3' ? 2 : 1;
    for (let i = 0; i < limit && isOctal(p.peek()); i++) {
      digits += p.peek();
      p.pos++;
    }
    return char(String.fromCharCode(parseInt(digits, 8)));
  }
  if (c === 'x') {
    if (isHex(p.peek(1)) && isHex(p.peek(2))) {
      p.pos += 3;
      return char(
        String.fromCharCode(parseInt(p.src.slice(p.pos - 2, p.pos), 16)),
      );
    }
    if (p.u) p.fail('Invalid escape', start);
    p.pos++;
    return char('x');
  }
  if (c === 'u') {
    if (p.u && p.peek(1) === '{') {
      const m = /^\{([0-9a-fA-F]+)\}/.exec(p.src.slice(p.pos + 1));
      if (!m || parseInt(m[1], 16) > 0x10ffff)
        p.fail('Invalid Unicode escape', start);
      p.pos += 1 + m[0].length;
      return char(String.fromCodePoint(parseInt(m[1], 16)));
    }
    const hex = p.src.slice(p.pos + 1, p.pos + 5);
    if (/^[0-9a-fA-F]{4}$/.test(hex)) {
      p.pos += 5;
      const lead = parseInt(hex, 16);
      const trail = /^\\u([dD][c-fC-F][0-9a-fA-F]{2})/.exec(p.src.slice(p.pos));
      if (p.u && lead >= 0xd800 && lead <= 0xdbff && trail) {
        p.pos += 6;
        return char(String.fromCharCode(lead, parseInt(trail[1], 16)));
      }
      return char(String.fromCharCode(lead));
    }
    if (p.u) p.fail('Invalid Unicode escape', start);
    p.pos++;
    return char('u');
  }
  if (SYNTAX.includes(c) || (inClass && c === '-')) {
    p.pos++;
    return char(c);
  }
  if (p.u) p.fail('Invalid escape', start);
  if (c === 'k' && p.named) p.fail('Invalid named reference', start);
  const ch = p.src[p.pos];
  p.pos++;
  return char(ch);
}

export function atomEscape(p: Cursor): RegexNode {
  const start = p.pos;
  p.pos++;
  const c = p.peek();
  if (c !== undefined && 'dDwWsS'.includes(c)) {
    p.pos++;
    return {
      type: 'escape-class',
      kind: c as EscapeClassKind,
      start,
      end: p.pos,
    };
  }
  if ((c === 'p' || c === 'P') && p.u) return property(p, start);
  if (c === 'k' && (p.u || p.named)) {
    p.pos++;
    if (!p.eat('<')) p.fail('Invalid named reference', start);
    const name = p.groupName();
    if (!p.names.includes(name))
      p.fail('Invalid named capture referenced', start);
    return { type: 'backreference', ref: name, start, end: p.pos };
  }
  if (isDigit(c) && c !== '0') {
    const m = /^\d+/.exec(p.src.slice(p.pos))!;
    const n = Number(m[0]);
    if (n <= p.totalGroups) {
      p.pos += m[0].length;
      return { type: 'backreference', ref: n, start, end: p.pos };
    }
    if (p.u) p.fail('Invalid escape', start);
  }
  if (c === '-' && p.u) p.fail('Invalid escape', start);
  return characterEscape(p, start, false);
}
