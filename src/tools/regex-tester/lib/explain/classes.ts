import type {
  CharNode,
  ClassItem,
  ClassNode,
  EscapeClassKind,
  EscapeClassNode,
  PropertyNode,
} from './ast';
import type { Cursor } from './cursor';
import { characterEscape, property } from './escapes';
import {
  CLASS_SET_RESERVED_PUNCT,
  CLASS_SET_SYNTAX,
  RESERVED_DOUBLE,
  isDigit,
} from './lexical';

// Character class parsers: legacy classes and v-flag set notation.

// Classes without the v flag.

export function classLegacy(p: Cursor): ClassNode {
  const start = p.pos;
  p.pos++;
  const negated = p.eat('^');
  const items: ClassItem[] = [];
  for (;;) {
    if (p.pos >= p.src.length) p.fail('Unterminated character class', start);
    if (p.eat(']')) break;
    const a = classAtom(p);
    if (p.peek() === '-' && p.peek(1) !== ']' && p.peek(1) !== undefined) {
      const dash = p.pos;
      p.pos++;
      const b = classAtom(p);
      if (a.type !== 'char' || b.type !== 'char') {
        if (p.u) p.fail('Invalid character class', a.start);
        items.push(
          a,
          { type: 'char', value: '-', start: dash, end: dash + 1 },
          b,
        );
        continue;
      }
      if (a.value.codePointAt(0)! > b.value.codePointAt(0)!)
        p.fail('Range out of order in character class', a.start);
      items.push({
        type: 'range',
        from: a,
        to: b,
        start: a.start,
        end: b.end,
      });
    } else items.push(a);
  }
  return { type: 'class', negated, op: 'union', items, start, end: p.pos };
}

function classAtom(p: Cursor): CharNode | EscapeClassNode | PropertyNode {
  const start = p.pos;
  if (p.peek() !== '\\') {
    const ch = p.nextChar();
    p.pos += ch.length;
    return { type: 'char', value: ch, start, end: p.pos };
  }
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
  if (c === 'b') {
    p.pos++;
    return { type: 'char', value: '\b', start, end: p.pos };
  }
  if (p.u && isDigit(c) && c !== '0') p.fail('Invalid class escape', start);
  if (c === 'k' && !p.u) {
    p.pos++;
    return { type: 'char', value: 'k', start, end: p.pos };
  }
  return characterEscape(p, start, true);
}

// Classes with the v flag (set notation).

export function classV(p: Cursor): ClassNode {
  const start = p.pos;
  p.pos++;
  const negated = p.eat('^');
  if (p.eat(']'))
    return {
      type: 'class',
      negated,
      op: 'union',
      items: [],
      start,
      end: p.pos,
    };
  const first = setOperand(p);
  let op: ClassNode['op'] = 'union';
  if (p.src.startsWith('&&', p.pos)) op = 'intersection';
  else if (p.src.startsWith('--', p.pos)) op = 'subtraction';
  const items: ClassItem[] = [];
  if (op === 'union') {
    items.push(maybeRange(p, first));
    while (!p.eat(']')) {
      if (p.pos >= p.src.length) p.fail('Unterminated character class', start);
      if (p.src.startsWith('&&', p.pos) || p.src.startsWith('--', p.pos))
        p.fail('Invalid set operation in character class');
      items.push(maybeRange(p, setOperand(p)));
    }
  } else {
    items.push(first);
    const token = op === 'intersection' ? '&&' : '--';
    while (!p.eat(']')) {
      if (p.pos >= p.src.length) p.fail('Unterminated character class', start);
      if (!p.eat(token)) p.fail('Invalid set operation in character class');
      if (p.peek() === '&' && op === 'intersection')
        p.fail('Invalid character in character class');
      const operand = setOperand(p);
      items.push(operand);
    }
  }
  return { type: 'class', negated, op, items, start, end: p.pos };
}

function maybeRange(p: Cursor, a: ClassItem): ClassItem {
  if (a.type !== 'char' || p.peek() !== '-' || p.peek(1) === '-') return a;
  p.pos++;
  const b = setOperand(p);
  if (b.type !== 'char') p.fail('Invalid character class', a.start);
  if (a.value.codePointAt(0)! > b.value.codePointAt(0)!)
    p.fail('Range out of order in character class', a.start);
  return { type: 'range', from: a, to: b, start: a.start, end: b.end };
}

function setOperand(p: Cursor): ClassItem {
  const start = p.pos;
  const c = p.peek();
  if (c === undefined) p.fail('Unterminated character class');
  if (c === '[') return classV(p);
  if (c === '\\') {
    p.pos++;
    const e = p.peek();
    if (e !== undefined && 'dDwWsS'.includes(e)) {
      p.pos++;
      return {
        type: 'escape-class',
        kind: e as EscapeClassKind,
        start,
        end: p.pos,
      };
    }
    if (e === 'p' || e === 'P') return property(p, start);
    if (e === 'q') {
      p.pos++;
      if (!p.eat('{')) p.fail('Invalid escape', start);
      const strings: string[] = [''];
      for (;;) {
        if (p.pos >= p.src.length) p.fail('Invalid escape', start);
        if (p.eat('}')) break;
        if (p.eat('|')) {
          strings.push('');
          continue;
        }
        strings[strings.length - 1] += setCharacter(p).value;
      }
      return { type: 'strings', strings, start, end: p.pos };
    }
    if (e === 'b') {
      p.pos++;
      return { type: 'char', value: '\b', start, end: p.pos };
    }
    if (e !== undefined && CLASS_SET_RESERVED_PUNCT.includes(e)) {
      p.pos++;
      return { type: 'char', value: e, start, end: p.pos };
    }
    if (isDigit(e) && e !== '0') p.fail('Invalid class escape', start);
    return characterEscape(p, start, true);
  }
  return setCharacter(p);
}

/** A plain ClassSetCharacter (or escape) for v-mode classes and `\q{}`. */
function setCharacter(p: Cursor): CharNode {
  const start = p.pos;
  const c = p.peek()!;
  if (c === '\\') {
    p.pos++;
    const e = p.peek();
    if (e !== undefined && CLASS_SET_RESERVED_PUNCT.includes(e)) {
      p.pos++;
      return { type: 'char', value: e, start, end: p.pos };
    }
    if (e === 'b') {
      p.pos++;
      return { type: 'char', value: '\b', start, end: p.pos };
    }
    return characterEscape(p, start, true);
  }
  if (CLASS_SET_SYNTAX.includes(c) && c !== '|')
    p.fail('Invalid character in character class');
  if (c === '|') p.fail('Invalid character in character class');
  if (RESERVED_DOUBLE.includes(c) && p.peek(1) === c)
    p.fail('Invalid set operation in character class');
  const ch = p.nextChar();
  p.pos += ch.length;
  return { type: 'char', value: ch, start, end: p.pos };
}
