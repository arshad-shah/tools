import { ToolError } from '@/shared/lib/errors';
import type { Rng } from '@/shared/lib/prng';

/** Open-ended quantifiers (`*`, `+`, `{n,}`) stop at this many repeats. */
export const MAX_REPEAT = 16;

type Node =
  | { kind: 'seq'; items: Node[] }
  | { kind: 'alt'; options: Node[] }
  | { kind: 'chars'; chars: string[] }
  | { kind: 'repeat'; node: Node; min: number; max: number };

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) =>
    String.fromCharCode(from + i),
  );

const DIGITS = range(0x30, 0x39);
const WORD = [...range(0x41, 0x5a), ...range(0x61, 0x7a), ...DIGITS, '_'];
const SPACE = [' '];
const PRINTABLE = range(0x20, 0x7e);
const complement = (chars: readonly string[]) =>
  PRINTABLE.filter((c) => !chars.includes(c));

const unsupported = (what: string): never => {
  throw new ToolError(
    'INVALID_INPUT',
    `Patterns do not support ${what}; use classes, ranges, groups, alternation and quantifiers`,
  );
};

const invalid = (message: string): never => {
  throw new ToolError('INVALID_INPUT', `Invalid pattern: ${message}`);
};

class Parser {
  private i = 0;
  constructor(private readonly src: string) {}

  parse(): Node {
    const node = this.alternation();
    if (this.i < this.src.length) invalid(`unexpected ) at ${this.i + 1}`);
    return node;
  }

  private peek() {
    return this.src[this.i];
  }

  private alternation(): Node {
    const options = [this.sequence()];
    while (this.peek() === '|') {
      this.i++;
      options.push(this.sequence());
    }
    return options.length === 1 ? options[0] : { kind: 'alt', options };
  }

  private sequence(): Node {
    const items: Node[] = [];
    while (
      this.i < this.src.length &&
      this.peek() !== '|' &&
      this.peek() !== ')'
    ) {
      const atom = this.atom();
      if (atom) items.push(this.quantified(atom));
    }
    return { kind: 'seq', items };
  }

  private atom(): Node | null {
    const ch = this.src[this.i++];
    switch (ch) {
      case '^':
      case '$':
        return null; // anchors are ignored
      case '.':
        return { kind: 'chars', chars: PRINTABLE };
      case '[':
        return { kind: 'chars', chars: this.charClass() };
      case '(':
        return this.group();
      case '\\':
        return this.escape(false);
      case '*':
      case '+':
      case '?':
      case '{':
        return invalid(`nothing to repeat before ${ch} at ${this.i}`);
      default:
        return { kind: 'chars', chars: [ch] };
    }
  }

  private group(): Node {
    if (this.peek() === '?') {
      const next = this.src[this.i + 1];
      if (next === ':') this.i += 2;
      else if (next === '<' && /[A-Za-z_]/.test(this.src[this.i + 2] ?? '')) {
        const end = this.src.indexOf('>', this.i);
        if (end === -1) invalid('unterminated group name');
        this.i = end + 1;
      } else if (next === '=' || next === '!')
        unsupported('lookahead (?= and (?!');
      else if (next === '<') unsupported('lookbehind (?<= and (?<!');
      else unsupported(`the group modifier (?${next ?? ''}`);
    }
    const node = this.alternation();
    if (this.peek() !== ')') invalid('missing )');
    this.i++;
    return node;
  }

  /** An escape after the backslash; `inClass` limits it to a set. */
  private escape(inClass: boolean): Node {
    const ch = this.src[this.i++];
    if (ch === undefined) return invalid('the pattern ends with a backslash');
    const set = (chars: string[]): Node => ({ kind: 'chars', chars });
    switch (ch) {
      case 'd':
        return set(DIGITS);
      case 'D':
        return set(complement(DIGITS));
      case 'w':
        return set(WORD);
      case 'W':
        return set(complement(WORD));
      case 's':
        return set(SPACE);
      case 'S':
        return set(complement(SPACE));
      case 't':
        return set(['\t']);
      case 'n':
        return set(['\n']);
      case 'r':
        return set(['\r']);
      case 'b':
        if (inClass) return set(['\b']);
        return { kind: 'seq', items: [] }; // word boundary: an anchor
      case 'B':
        return { kind: 'seq', items: [] };
      case 'x': {
        const hex = this.src.slice(this.i, this.i + 2);
        if (!/^[0-9a-fA-F]{2}$/.test(hex)) invalid('\\x needs two hex digits');
        this.i += 2;
        return set([String.fromCharCode(parseInt(hex, 16))]);
      }
      case 'u': {
        const hex = this.src.slice(this.i, this.i + 4);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) unsupported('this \\u escape');
        this.i += 4;
        return set([String.fromCharCode(parseInt(hex, 16))]);
      }
      case 'p':
      case 'P':
        return unsupported('Unicode property escapes (\\p)');
      case 'k':
        return unsupported('named back-references (\\k)');
      default:
        if (/[1-9]/.test(ch)) return unsupported(`back-references (\\${ch})`);
        if (/[A-Za-z]/.test(ch)) return unsupported(`the escape \\${ch}`);
        return set([ch]);
    }
  }

  private charClass(): string[] {
    let negate = false;
    if (this.peek() === '^') {
      negate = true;
      this.i++;
    }
    const chars = new Set<string>();
    let first = true;
    for (;;) {
      if (this.i >= this.src.length) invalid('missing ]');
      let ch = this.src[this.i++];
      if (ch === ']' && !first) break;
      first = false;
      let single: string | null = ch;
      if (ch === '\\') {
        const node = this.escape(true) as { chars: string[] };
        if (node.chars.length === 1) single = node.chars[0];
        else {
          for (const c of node.chars) chars.add(c);
          continue;
        }
      }
      ch = single;
      if (
        this.peek() === '-' &&
        this.src[this.i + 1] !== ']' &&
        this.src[this.i + 1] !== undefined
      ) {
        this.i++;
        let to = this.src[this.i++];
        if (to === '\\') {
          const node = this.escape(true) as { chars: string[] };
          if (node.chars.length !== 1)
            invalid('a range cannot end with a class');
          to = node.chars[0];
        }
        const a = ch.charCodeAt(0);
        const b = to.charCodeAt(0);
        if (b < a) invalid(`the range ${ch}-${to} is out of order`);
        for (let c = a; c <= b; c++) chars.add(String.fromCharCode(c));
      } else {
        chars.add(ch);
      }
    }
    const list = [...chars];
    const out = negate ? complement(list) : list;
    if (out.length === 0) invalid('a character class matches nothing');
    return out;
  }

  private quantified(atom: Node): Node {
    let min: number;
    let max: number;
    const ch = this.peek();
    if (ch === '*') [min, max] = [0, MAX_REPEAT];
    else if (ch === '+') [min, max] = [1, MAX_REPEAT];
    else if (ch === '?') [min, max] = [0, 1];
    else if (ch === '{') {
      const m = /^\{(\d+)(,(\d*))?\}/.exec(this.src.slice(this.i));
      if (!m) return atom; // a literal brace
      min = Number(m[1]);
      max =
        m[2] === undefined
          ? min
          : m[3] === ''
            ? Math.max(min, MAX_REPEAT)
            : Number(m[3]);
      if (max < min) invalid(`the quantifier ${m[0]} is out of order`);
      this.i += m[0].length - 1;
    } else return atom;
    this.i++;
    if (this.peek() === '?' || this.peek() === '+') this.i++; // lazy or possessive
    min = Math.min(min, MAX_REPEAT);
    max = Math.min(max, MAX_REPEAT);
    return this.quantified({ kind: 'repeat', node: atom, min, max });
  }
}

const cache = new Map<string, Node>();

/** Parses `pattern` once (cached) or throws INVALID_INPUT naming the problem. */
export function compilePattern(pattern: string): Node {
  let node = cache.get(pattern);
  if (!node) {
    node = new Parser(pattern).parse();
    if (cache.size > 100) cache.clear();
    cache.set(pattern, node);
  }
  return node;
}

function emit(node: Node, rng: Rng, out: string[]): void {
  switch (node.kind) {
    case 'seq':
      for (const n of node.items) emit(n, rng, out);
      return;
    case 'alt':
      emit(rng.pick(node.options), rng, out);
      return;
    case 'chars':
      out.push(rng.pick(node.chars));
      return;
    case 'repeat': {
      const n = node.min + rng.int(node.max - node.min + 1);
      for (let i = 0; i < n; i++) emit(node.node, rng, out);
    }
  }
}

/**
 * A string matching `pattern` (classes, ranges, `.`, groups, alternation and
 * quantifiers, with open repeats capped at MAX_REPEAT). Anchors and word
 * boundaries are ignored; look-arounds, back-references and Unicode
 * property escapes give INVALID_INPUT naming the construct.
 */
export function generateFromPattern(pattern: string, rng: Rng): string {
  const out: string[] = [];
  emit(compilePattern(pattern), rng, out);
  return out.join('');
}
