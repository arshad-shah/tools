import type {
  AlternationNode,
  GroupKind,
  GroupNode,
  RegexAst,
  RegexNode,
  SequenceNode,
} from './ast';
import { classLegacy, classV } from './classes';
import { Cursor } from './cursor';
import { atomEscape } from './escapes';
import { DUPLICATE_NAMES, MODIFIERS, validateFlags } from './lexical';

export * from './ast';

/** Engine features the parser follows (detected; overridable in tests). */
export interface RegexFeatures {
  /** ES2025 duplicate named groups in different alternatives. */
  duplicateNames: boolean;
}

class Parser extends Cursor {
  private groupIndex = 0;
  private readonly seenNames: string[] = [];
  /** Names on the current path: earlier terms and enclosing alternatives. */
  private readonly pathNames: string[] = [];

  constructor(
    src: string,
    flags: string,
    private readonly features: RegexFeatures,
  ) {
    super(src, flags);
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

  private disjunction(): AlternationNode {
    const start = this.pos;
    // Each alternative sees the names before the disjunction, not its
    // siblings'; after it, every alternative's names are on the path.
    const mark = this.pathNames.length;
    const added: string[] = [];
    const next = () => {
      const alt = this.alternative();
      added.push(...this.pathNames.splice(mark));
      return alt;
    };
    const alternatives = [next()];
    while (this.peek() === '|') {
      this.pos++;
      alternatives.push(next());
    }
    this.pathNames.push(...added);
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
        atom = this.v ? classV(this) : classLegacy(this);
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
        } else atom = atomEscape(this);
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
        const clash = this.features.duplicateNames
          ? this.pathNames.includes(name)
          : this.seenNames.includes(name);
        if (clash) this.fail('Duplicate capture group name', start);
        this.seenNames.push(name);
        this.pathNames.push(name);
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
}

/**
 * Parses an ECMAScript 2025 pattern into an AST whose nodes carry their
 * `[start, end)` source spans. Accepts what `new RegExp(pattern, flags)`
 * accepts in the running engine; a syntax error is INVALID_INPUT with the
 * column (`RegexSyntaxError`).
 */
export function parseRegex(
  pattern: string,
  flags: string,
  features: RegexFeatures = { duplicateNames: DUPLICATE_NAMES },
): RegexAst {
  validateFlags(flags);
  const p = new Parser(pattern, flags, features);
  const body = p.parse();
  return {
    pattern,
    flags,
    body,
    groupCount: p.groupCount,
    groupNames: p.groupNames,
  };
}
