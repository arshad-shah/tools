import { ToolError } from '@/shared/lib/errors';

/** Half-open source range `[start, end)` in the pattern. */
export interface Span {
  start: number;
  end: number;
}

export type GroupKind =
  | 'capture'
  | 'named'
  | 'noncapture'
  | 'lookahead'
  | 'negative-lookahead'
  | 'lookbehind'
  | 'negative-lookbehind'
  | 'modifiers';

export type EscapeClassKind = 'd' | 'D' | 'w' | 'W' | 's' | 'S';

export interface CharNode extends Span {
  type: 'char';
  /** The character (a whole code point in Unicode mode). */
  value: string;
}
export interface DotNode extends Span {
  type: 'dot';
}
export interface AnchorNode extends Span {
  type: 'anchor';
  kind: 'start' | 'end';
}
export interface BoundaryNode extends Span {
  type: 'boundary';
  negated: boolean;
}
export interface EscapeClassNode extends Span {
  type: 'escape-class';
  kind: EscapeClassKind;
}
export interface PropertyNode extends Span {
  type: 'property';
  negated: boolean;
  name: string;
  value?: string;
}
export interface BackreferenceNode extends Span {
  type: 'backreference';
  ref: number | string;
}
export interface RangeNode extends Span {
  type: 'range';
  from: CharNode;
  to: CharNode;
}
export interface StringsNode extends Span {
  type: 'strings';
  strings: string[];
}
export type ClassItem =
  | CharNode
  | RangeNode
  | EscapeClassNode
  | PropertyNode
  | ClassNode
  | StringsNode;
export interface ClassNode extends Span {
  type: 'class';
  negated: boolean;
  /** `union` lists members; the others list their operands in order. */
  op: 'union' | 'intersection' | 'subtraction';
  items: ClassItem[];
}
export interface SequenceNode extends Span {
  type: 'sequence';
  items: RegexNode[];
}
export interface AlternationNode extends Span {
  type: 'alternation';
  alternatives: SequenceNode[];
}
export interface GroupNode extends Span {
  type: 'group';
  kind: GroupKind;
  /** Capture number (capture and named groups). */
  index?: number;
  name?: string;
  modifiers?: { add: string; remove: string };
  body: AlternationNode;
}
export interface QuantifierNode extends Span {
  type: 'quantifier';
  min: number;
  /** `Infinity` when unbounded. */
  max: number;
  lazy: boolean;
  target: RegexNode;
}

export type RegexNode =
  | CharNode
  | DotNode
  | AnchorNode
  | BoundaryNode
  | EscapeClassNode
  | PropertyNode
  | BackreferenceNode
  | ClassNode
  | SequenceNode
  | AlternationNode
  | GroupNode
  | QuantifierNode;

export interface RegexAst {
  pattern: string;
  flags: string;
  body: AlternationNode;
  groupCount: number;
  groupNames: string[];
}

/** A syntax error with the 1-based column it points at. */
export class RegexSyntaxError extends ToolError {
  readonly column: number;
  constructor(message: string, column: number) {
    super('INVALID_INPUT', `${message} (column ${column})`);
    this.column = column;
  }
}

const supports = (source: string, flags = ''): boolean => {
  try {
    new RegExp(source, flags);
    return true;
  } catch {
    return false;
  }
};
/** Engine features that vary by browser: follow the running engine. */
const MODIFIERS = supports('(?i:a)');
const DUPLICATE_NAMES = supports('(?<a>x)|(?<a>y)');

const ID_START = /[\p{ID_Start}$_]/u;
const ID_CONTINUE = /[\p{ID_Continue}$‌‍]/u;
const SYNTAX = '^$\\.*+?()[]{}|/';
const CLASS_SET_SYNTAX = '()[]{}/-\\|';
const RESERVED_DOUBLE = '&!#$%*+,.:;<=>?@^`~';
const CLASS_SET_RESERVED_PUNCT = '&-!#%,:;<=>@`~';
const CONTROL: Record<string, string> = {
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  v: '\v',
};

const isDigit = (c: string | undefined) =>
  c !== undefined && c >= '0' && c <= '9';
const isOctal = (c: string | undefined) =>
  c !== undefined && c >= '0' && c <= '7';
const isHex = (c: string | undefined) =>
  c !== undefined && /^[0-9a-fA-F]$/.test(c);
const isLetter = (c: string | undefined) =>
  c !== undefined && /^[A-Za-z]$/.test(c);

const validProperty = (body: string, flag: 'u' | 'v', negated: boolean) =>
  supports(`\\${negated ? 'P' : 'p'}{${body}}`, flag);

function validateFlags(flags: string): void {
  const seen = new Set<string>();
  for (let i = 0; i < flags.length; i++) {
    const f = flags[i];
    if (!'dgimsuvy'.includes(f) || seen.has(f))
      throw new ToolError('INVALID_INPUT', `Invalid flags: ${flags}`);
    seen.add(f);
  }
  if (seen.has('u') && seen.has('v'))
    throw new ToolError(
      'INVALID_INPUT',
      'The u and v flags cannot be combined',
    );
}

/** Counts capturing groups and collects names ahead of parsing. */
function prescan(src: string, v: boolean) {
  let count = 0;
  const names: string[] = [];
  let depth = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') {
      i++;
    } else if (c === '[') {
      depth = v ? depth + 1 : 1;
    } else if (c === ']') {
      if (depth > 0) depth--;
    } else if (depth === 0 && c === '(') {
      if (src[i + 1] !== '?') count++;
      else if (src[i + 2] === '<' && src[i + 3] !== '=' && src[i + 3] !== '!') {
        count++;
        const close = src.indexOf('>', i + 3);
        if (close !== -1) names.push(src.slice(i + 3, close));
      }
    }
  }
  return { count, names };
}

class Parser {
  private pos = 0;
  private groupIndex = 0;
  private readonly seenNames: string[] = [];
  private readonly u: boolean;
  private readonly v: boolean;
  private readonly named: boolean;
  private readonly totalGroups: number;
  private readonly names: string[];

  constructor(
    private readonly src: string,
    flags: string,
  ) {
    this.v = flags.includes('v');
    this.u = this.v || flags.includes('u');
    const pre = prescan(src, this.v);
    this.totalGroups = pre.count;
    this.names = pre.names;
    this.named = pre.names.length > 0;
  }

  parse(): RegexAst['body'] {
    const body = this.disjunction();
    if (this.pos < this.src.length) this.fail("Unmatched ')'");
    return body;
  }

  get groupCount() {
    return this.groupIndex;
  }
  get groupNames() {
    return [...new Set(this.seenNames)];
  }

  private fail(message: string, at = this.pos): never {
    throw new RegexSyntaxError(message, at + 1);
  }

  private peek(offset = 0): string | undefined {
    return this.src[this.pos + offset];
  }

  private eat(s: string): boolean {
    if (this.src.startsWith(s, this.pos)) {
      this.pos += s.length;
      return true;
    }
    return false;
  }

  /** The next source character, a whole code point in Unicode mode. */
  private nextChar(): string {
    if (this.u) {
      const cp = this.src.codePointAt(this.pos)!;
      return String.fromCodePoint(cp);
    }
    return this.src[this.pos];
  }

  private disjunction(): AlternationNode {
    const start = this.pos;
    const alternatives = [this.alternative()];
    while (this.peek() === '|') {
      this.pos++;
      alternatives.push(this.alternative());
    }
    return { type: 'alternation', alternatives, start, end: this.pos };
  }

  private alternative(): SequenceNode {
    const start = this.pos;
    const items: RegexNode[] = [];
    while (
      this.pos < this.src.length &&
      this.peek() !== '|' &&
      this.peek() !== ')'
    )
      items.push(this.term());
    return { type: 'sequence', items, start, end: this.pos };
  }

  private term(): RegexNode {
    const start = this.pos;
    const c = this.peek()!;
    let atom: RegexNode;
    let quantifiable = true;
    switch (c) {
      case '^':
      case '$':
        this.pos++;
        atom = {
          type: 'anchor',
          kind: c === '^' ? 'start' : 'end',
          start,
          end: this.pos,
        };
        quantifiable = false;
        break;
      case '.':
        this.pos++;
        atom = { type: 'dot', start, end: this.pos };
        break;
      case '(': {
        const g = this.group();
        atom = g;
        quantifiable =
          g.kind !== 'lookbehind' &&
          g.kind !== 'negative-lookbehind' &&
          (!this.u ||
            (g.kind !== 'lookahead' && g.kind !== 'negative-lookahead'));
        break;
      }
      case '[':
        atom = this.v ? this.classV() : this.classLegacy();
        break;
      case '*':
      case '+':
      case '?':
        this.fail('Nothing to repeat');
        break;
      case '{':
        if (this.u)
          this.fail(
            this.brace() ? 'Nothing to repeat' : 'Lone quantifier brackets',
          );
        if (this.brace()) this.fail('Nothing to repeat');
        this.pos++;
        atom = { type: 'char', value: '{', start, end: this.pos };
        break;
      case '}':
      case ']':
        if (this.u) this.fail('Lone quantifier brackets');
        this.pos++;
        atom = { type: 'char', value: c, start, end: this.pos };
        break;
      case '\\':
        if (this.peek(1) === 'b' || this.peek(1) === 'B') {
          this.pos += 2;
          atom = {
            type: 'boundary',
            negated: this.src[start + 1] === 'B',
            start,
            end: this.pos,
          };
          quantifiable = false;
        } else atom = this.atomEscape();
        break;
      default: {
        const ch = this.nextChar();
        this.pos += ch.length;
        atom = { type: 'char', value: ch, start, end: this.pos };
      }
    }
    return this.quantifier(atom, quantifiable);
  }

  /** A `{n}`, `{n,}` or `{n,m}` at the cursor, without consuming it. */
  private brace(): { min: number; max: number; length: number } | null {
    const m = /^\{(\d+)(,(\d*))?\}/.exec(this.src.slice(this.pos));
    if (!m) return null;
    const min = Number(m[1]);
    const max =
      m[2] === undefined ? min : m[3] === '' ? Infinity : Number(m[3]);
    return { min, max, length: m[0].length };
  }

  private quantifier(atom: RegexNode, quantifiable: boolean): RegexNode {
    const at = this.pos;
    const c = this.peek();
    let min: number;
    let max: number;
    if (c === '*' || c === '+' || c === '?') {
      min = c === '+' ? 1 : 0;
      max = c === '?' ? 1 : Infinity;
      this.pos++;
    } else if (c === '{') {
      const b = this.brace();
      if (!b) {
        if (this.u) this.fail('Incomplete quantifier');
        return atom;
      }
      ({ min, max } = b);
      this.pos += b.length;
      if (min > max) this.fail('Numbers out of order in {} quantifier', at);
    } else return atom;
    if (!quantifiable)
      this.fail(
        atom.type === 'group' ? 'Invalid quantifier' : 'Nothing to repeat',
        at,
      );
    const lazy = this.eat('?');
    return {
      type: 'quantifier',
      min,
      max,
      lazy,
      target: atom,
      start: atom.start,
      end: this.pos,
    };
  }

  private groupName(): string {
    const start = this.pos;
    const close = this.src.indexOf('>', this.pos);
    if (close === -1) this.fail('Invalid capture group name');
    const name = this.src.slice(this.pos, close);
    const chars = [...name];
    if (
      chars.length === 0 ||
      !ID_START.test(chars[0]) ||
      !chars.every((ch) => ID_CONTINUE.test(ch) || ch === '$')
    )
      this.fail('Invalid capture group name', start);
    this.pos = close + 1;
    return name;
  }

  private group(): GroupNode {
    const start = this.pos;
    this.pos++;
    let kind: GroupKind = 'capture';
    let name: string | undefined;
    let index: number | undefined;
    let modifiers: GroupNode['modifiers'];
    if (this.eat('?')) {
      if (this.eat(':')) kind = 'noncapture';
      else if (this.eat('=')) kind = 'lookahead';
      else if (this.eat('!')) kind = 'negative-lookahead';
      else if (this.eat('<=')) kind = 'lookbehind';
      else if (this.eat('<!')) kind = 'negative-lookbehind';
      else if (this.eat('<')) {
        kind = 'named';
        name = this.groupName();
        if (this.seenNames.includes(name) && !DUPLICATE_NAMES)
          this.fail('Duplicate capture group name', start);
        this.seenNames.push(name);
        index = ++this.groupIndex;
      } else {
        const m = /^([ims]*)(?:-([ims]*))?:/.exec(this.src.slice(this.pos));
        const add = m?.[1] ?? '';
        const remove = m?.[2] ?? '';
        const letters = add + remove;
        if (
          !MODIFIERS ||
          !m ||
          (m[2] !== undefined && letters === '') ||
          new Set(letters).size !== letters.length
        )
          this.fail('Invalid group', start);
        this.pos += m[0].length;
        kind = 'modifiers';
        modifiers = { add, remove };
      }
    } else index = ++this.groupIndex;
    const body = this.disjunction();
    if (!this.eat(')')) this.fail('Unterminated group', start);
    return {
      type: 'group',
      kind,
      name,
      index,
      modifiers,
      body,
      start,
      end: this.pos,
    };
  }

  /** `\p{...}` or `\P{...}` with the cursor on the `p`. */
  private property(start: number): PropertyNode {
    const negated = this.peek() === 'P';
    this.pos++;
    const m = /^\{([A-Za-z_]+)(?:=([A-Za-z0-9_]+))?\}/.exec(
      this.src.slice(this.pos),
    );
    if (!m || !validProperty(m[0].slice(1, -1), this.v ? 'v' : 'u', negated))
      this.fail('Invalid property name', start);
    this.pos += m[0].length;
    return {
      type: 'property',
      negated,
      name: m[1],
      value: m[2],
      start,
      end: this.pos,
    };
  }

  /** Character escapes shared by atoms and classes; cursor after `\`. */
  private characterEscape(start: number, inClass: boolean): CharNode {
    const c = this.peek();
    const char = (value: string): CharNode => ({
      type: 'char',
      value,
      start,
      end: this.pos,
    });
    if (c === undefined) this.fail('\\ at end of pattern', start);
    if (CONTROL[c]) {
      this.pos++;
      return char(CONTROL[c]);
    }
    if (c === 'c') {
      const l = this.peek(1);
      if (isLetter(l) || (inClass && !this.u && (isDigit(l) || l === '_'))) {
        this.pos += 2;
        return char(String.fromCharCode(l!.charCodeAt(0) % 32));
      }
      if (this.u) this.fail('Invalid unicode escape', start);
      // Annex B: a lone backslash; the `c` is read again as a literal.
      return char('\\');
    }
    if (c === '0' && !isDigit(this.peek(1))) {
      this.pos++;
      return char('\0');
    }
    if (isDigit(c)) {
      if (this.u) this.fail('Invalid escape', start);
      if (c === '8' || c === '9') {
        this.pos++;
        return char(c);
      }
      let digits = c;
      this.pos++;
      const limit = c <= '3' ? 2 : 1;
      for (let i = 0; i < limit && isOctal(this.peek()); i++) {
        digits += this.peek();
        this.pos++;
      }
      return char(String.fromCharCode(parseInt(digits, 8)));
    }
    if (c === 'x') {
      if (isHex(this.peek(1)) && isHex(this.peek(2))) {
        this.pos += 3;
        return char(
          String.fromCharCode(
            parseInt(this.src.slice(this.pos - 2, this.pos), 16),
          ),
        );
      }
      if (this.u) this.fail('Invalid escape', start);
      this.pos++;
      return char('x');
    }
    if (c === 'u') {
      if (this.u && this.peek(1) === '{') {
        const m = /^\{([0-9a-fA-F]+)\}/.exec(this.src.slice(this.pos + 1));
        if (!m || parseInt(m[1], 16) > 0x10ffff)
          this.fail('Invalid Unicode escape', start);
        this.pos += 1 + m[0].length;
        return char(String.fromCodePoint(parseInt(m[1], 16)));
      }
      const hex = this.src.slice(this.pos + 1, this.pos + 5);
      if (/^[0-9a-fA-F]{4}$/.test(hex)) {
        this.pos += 5;
        const lead = parseInt(hex, 16);
        const trail = /^\\u([dD][c-fC-F][0-9a-fA-F]{2})/.exec(
          this.src.slice(this.pos),
        );
        if (this.u && lead >= 0xd800 && lead <= 0xdbff && trail) {
          this.pos += 6;
          return char(String.fromCharCode(lead, parseInt(trail[1], 16)));
        }
        return char(String.fromCharCode(lead));
      }
      if (this.u) this.fail('Invalid Unicode escape', start);
      this.pos++;
      return char('u');
    }
    if (SYNTAX.includes(c) || (inClass && c === '-')) {
      this.pos++;
      return char(c);
    }
    if (this.u) this.fail('Invalid escape', start);
    if (c === 'k' && this.named) this.fail('Invalid named reference', start);
    const ch = this.src[this.pos];
    this.pos++;
    return char(ch);
  }

  private atomEscape(): RegexNode {
    const start = this.pos;
    this.pos++;
    const c = this.peek();
    if (c !== undefined && 'dDwWsS'.includes(c)) {
      this.pos++;
      return {
        type: 'escape-class',
        kind: c as EscapeClassKind,
        start,
        end: this.pos,
      };
    }
    if ((c === 'p' || c === 'P') && this.u) return this.property(start);
    if (c === 'k' && (this.u || this.named)) {
      this.pos++;
      if (!this.eat('<')) this.fail('Invalid named reference', start);
      const name = this.groupName();
      if (!this.names.includes(name))
        this.fail('Invalid named capture referenced', start);
      return { type: 'backreference', ref: name, start, end: this.pos };
    }
    if (isDigit(c) && c !== '0') {
      const m = /^\d+/.exec(this.src.slice(this.pos))!;
      const n = Number(m[0]);
      if (n <= this.totalGroups) {
        this.pos += m[0].length;
        return { type: 'backreference', ref: n, start, end: this.pos };
      }
      if (this.u) this.fail('Invalid escape', start);
    }
    if (c === '-' && this.u) this.fail('Invalid escape', start);
    return this.characterEscape(start, false);
  }

  // Classes without the v flag.

  private classLegacy(): ClassNode {
    const start = this.pos;
    this.pos++;
    const negated = this.eat('^');
    const items: ClassItem[] = [];
    for (;;) {
      if (this.pos >= this.src.length)
        this.fail('Unterminated character class', start);
      if (this.eat(']')) break;
      const a = this.classAtom();
      if (
        this.peek() === '-' &&
        this.peek(1) !== ']' &&
        this.peek(1) !== undefined
      ) {
        const dash = this.pos;
        this.pos++;
        const b = this.classAtom();
        if (a.type !== 'char' || b.type !== 'char') {
          if (this.u) this.fail('Invalid character class', a.start);
          items.push(
            a,
            { type: 'char', value: '-', start: dash, end: dash + 1 },
            b,
          );
          continue;
        }
        if (a.value.codePointAt(0)! > b.value.codePointAt(0)!)
          this.fail('Range out of order in character class', a.start);
        items.push({
          type: 'range',
          from: a,
          to: b,
          start: a.start,
          end: b.end,
        });
      } else items.push(a);
    }
    return { type: 'class', negated, op: 'union', items, start, end: this.pos };
  }

  private classAtom(): CharNode | EscapeClassNode | PropertyNode {
    const start = this.pos;
    if (this.peek() !== '\\') {
      const ch = this.nextChar();
      this.pos += ch.length;
      return { type: 'char', value: ch, start, end: this.pos };
    }
    this.pos++;
    const c = this.peek();
    if (c !== undefined && 'dDwWsS'.includes(c)) {
      this.pos++;
      return {
        type: 'escape-class',
        kind: c as EscapeClassKind,
        start,
        end: this.pos,
      };
    }
    if ((c === 'p' || c === 'P') && this.u) return this.property(start);
    if (c === 'b') {
      this.pos++;
      return { type: 'char', value: '\b', start, end: this.pos };
    }
    if (this.u && isDigit(c) && c !== '0')
      this.fail('Invalid class escape', start);
    if (c === 'k' && !this.u) {
      this.pos++;
      return { type: 'char', value: 'k', start, end: this.pos };
    }
    return this.characterEscape(start, true);
  }

  // Classes with the v flag (set notation).

  private classV(): ClassNode {
    const start = this.pos;
    this.pos++;
    const negated = this.eat('^');
    if (this.eat(']'))
      return {
        type: 'class',
        negated,
        op: 'union',
        items: [],
        start,
        end: this.pos,
      };
    const first = this.setOperand();
    let op: ClassNode['op'] = 'union';
    if (this.src.startsWith('&&', this.pos)) op = 'intersection';
    else if (this.src.startsWith('--', this.pos)) op = 'subtraction';
    const items: ClassItem[] = [];
    if (op === 'union') {
      items.push(this.maybeRange(first));
      while (!this.eat(']')) {
        if (this.pos >= this.src.length)
          this.fail('Unterminated character class', start);
        if (
          this.src.startsWith('&&', this.pos) ||
          this.src.startsWith('--', this.pos)
        )
          this.fail('Invalid set operation in character class');
        items.push(this.maybeRange(this.setOperand()));
      }
    } else {
      items.push(first);
      const token = op === 'intersection' ? '&&' : '--';
      while (!this.eat(']')) {
        if (this.pos >= this.src.length)
          this.fail('Unterminated character class', start);
        if (!this.eat(token))
          this.fail('Invalid set operation in character class');
        if (this.peek() === '&' && op === 'intersection')
          this.fail('Invalid character in character class');
        const operand = this.setOperand();
        items.push(operand);
      }
    }
    return { type: 'class', negated, op, items, start, end: this.pos };
  }

  private maybeRange(a: ClassItem): ClassItem {
    if (a.type !== 'char' || this.peek() !== '-' || this.peek(1) === '-')
      return a;
    this.pos++;
    const b = this.setOperand();
    if (b.type !== 'char') this.fail('Invalid character class', a.start);
    if (a.value.codePointAt(0)! > b.value.codePointAt(0)!)
      this.fail('Range out of order in character class', a.start);
    return { type: 'range', from: a, to: b, start: a.start, end: b.end };
  }

  private setOperand(): ClassItem {
    const start = this.pos;
    const c = this.peek();
    if (c === undefined) this.fail('Unterminated character class');
    if (c === '[') return this.classV();
    if (c === '\\') {
      this.pos++;
      const e = this.peek();
      if (e !== undefined && 'dDwWsS'.includes(e)) {
        this.pos++;
        return {
          type: 'escape-class',
          kind: e as EscapeClassKind,
          start,
          end: this.pos,
        };
      }
      if (e === 'p' || e === 'P') return this.property(start);
      if (e === 'q') {
        this.pos++;
        if (!this.eat('{')) this.fail('Invalid escape', start);
        const strings: string[] = [''];
        for (;;) {
          if (this.pos >= this.src.length) this.fail('Invalid escape', start);
          if (this.eat('}')) break;
          if (this.eat('|')) {
            strings.push('');
            continue;
          }
          strings[strings.length - 1] += this.setCharacter().value;
        }
        return { type: 'strings', strings, start, end: this.pos };
      }
      if (e === 'b') {
        this.pos++;
        return { type: 'char', value: '\b', start, end: this.pos };
      }
      if (e !== undefined && CLASS_SET_RESERVED_PUNCT.includes(e)) {
        this.pos++;
        return { type: 'char', value: e, start, end: this.pos };
      }
      if (isDigit(e) && e !== '0') this.fail('Invalid class escape', start);
      return this.characterEscape(start, true);
    }
    return this.setCharacter();
  }

  /** A plain ClassSetCharacter (or escape) for v-mode classes and `\q{}`. */
  private setCharacter(): CharNode {
    const start = this.pos;
    const c = this.peek()!;
    if (c === '\\') {
      this.pos++;
      const e = this.peek();
      if (e !== undefined && CLASS_SET_RESERVED_PUNCT.includes(e)) {
        this.pos++;
        return { type: 'char', value: e, start, end: this.pos };
      }
      if (e === 'b') {
        this.pos++;
        return { type: 'char', value: '\b', start, end: this.pos };
      }
      return this.characterEscape(start, true);
    }
    if (CLASS_SET_SYNTAX.includes(c) && c !== '|')
      this.fail('Invalid character in character class');
    if (c === '|') this.fail('Invalid character in character class');
    if (RESERVED_DOUBLE.includes(c) && this.peek(1) === c)
      this.fail('Invalid set operation in character class');
    const ch = this.nextChar();
    this.pos += ch.length;
    return { type: 'char', value: ch, start, end: this.pos };
  }
}

/**
 * Parses an ECMAScript 2025 pattern into an AST whose nodes carry their
 * `[start, end)` source spans. Accepts what `new RegExp(pattern, flags)`
 * accepts in the running engine; a syntax error is INVALID_INPUT with the
 * column (`RegexSyntaxError`).
 */
export function parseRegex(pattern: string, flags: string): RegexAst {
  validateFlags(flags);
  const p = new Parser(pattern, flags);
  const body = p.parse();
  return {
    pattern,
    flags,
    body,
    groupCount: p.groupCount,
    groupNames: p.groupNames,
  };
}
