import type {
  AlternationNode,
  CharNode,
  ClassItem,
  ClassNode,
  EscapeClassKind,
  GroupNode,
  PropertyNode,
  QuantifierNode,
  RegexAst,
  RegexNode,
} from './parser';

/** One row of the explanation tree, linked to its pattern span. */
export interface ExplainNode {
  label: string;
  start: number;
  end: number;
  children: ExplainNode[];
  /** Set on capture groups, so the UI can highlight that group's matches. */
  groupIndex?: number;
}

interface Noun {
  one: string;
  many: string;
}

const ESCAPE_NOUN: Record<EscapeClassKind, Noun & { inClass: string }> = {
  d: { one: 'digit', many: 'digits', inClass: 'digits' },
  D: { one: 'non-digit', many: 'non-digits', inClass: 'non-digits' },
  w: {
    one: 'word character',
    many: 'word characters',
    inClass: 'word characters',
  },
  W: {
    one: 'non-word character',
    many: 'non-word characters',
    inClass: 'non-word characters',
  },
  s: {
    one: 'whitespace character',
    many: 'whitespace characters',
    inClass: 'whitespace',
  },
  S: {
    one: 'non-whitespace character',
    many: 'non-whitespace characters',
    inClass: 'non-whitespace',
  },
};

const CATEGORY: Record<string, string> = {
  L: 'letter',
  Letter: 'letter',
  Lu: 'uppercase letter',
  Uppercase_Letter: 'uppercase letter',
  Ll: 'lowercase letter',
  Lowercase_Letter: 'lowercase letter',
  Lt: 'titlecase letter',
  Lm: 'modifier letter',
  Lo: 'other letter',
  M: 'mark',
  Mark: 'mark',
  N: 'number',
  Number: 'number',
  Nd: 'decimal digit',
  Decimal_Number: 'decimal digit',
  P: 'punctuation character',
  Punctuation: 'punctuation character',
  S: 'symbol',
  Symbol: 'symbol',
  Sc: 'currency symbol',
  Z: 'separator',
  Separator: 'separator',
  Zs: 'space separator',
  C: 'control or other character',
  Cc: 'control character',
  Emoji: 'emoji',
  Alphabetic: 'alphabetic character',
  White_Space: 'whitespace character',
  ASCII: 'ASCII character',
  Any: 'character',
};

const NAMED_CHAR: Record<string, string> = {
  ' ': 'space',
  '\n': 'newline',
  '\r': 'carriage return',
  '\t': 'tab',
  '\v': 'vertical tab',
  '\f': 'form feed',
  '\b': 'backspace',
  '\0': 'NUL',
};

const charName = (c: string): string => {
  if (NAMED_CHAR[c]) return NAMED_CHAR[c];
  const cp = c.codePointAt(0)!;
  if (cp < 0x20 || cp === 0x7f)
    return `control character U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
  return c;
};

const plural = (word: string) =>
  /(s|x|ch|sh)$/.test(word) ? `${word}es` : `${word}s`;

function propertyNoun(p: PropertyNode): Noun {
  let one: string;
  if (p.value !== undefined) {
    const isScript = /^(Script|sc|Script_Extensions|scx)$/.test(p.name);
    const isCategory = /^(General_Category|gc)$/.test(p.name);
    one = isScript
      ? `character in the ${p.value.replace(/_/g, ' ')} script`
      : isCategory
        ? (CATEGORY[p.value] ?? `${p.value} character`)
        : `character with ${p.name} ${p.value}`;
  } else one = CATEGORY[p.name] ?? `${p.name.replace(/_/g, ' ')} character`;
  if (p.negated) one = `character that is not a ${one}`;
  const many = one.startsWith('character ')
    ? `characters${one.slice('character'.length)}`
    : plural(one);
  return { one, many };
}

const joinOr = (parts: string[]): string =>
  parts.length <= 1
    ? (parts[0] ?? 'nothing')
    : `${parts.slice(0, -1).join(', ')} or ${parts[parts.length - 1]}`;

/** A class member as a short phrase ("a to z", "digits"). */
function classItemText(item: ClassItem): string {
  switch (item.type) {
    case 'char':
      return charName(item.value);
    case 'range':
      return `${charName(item.from.value)} to ${charName(item.to.value)}`;
    case 'escape-class':
      return ESCAPE_NOUN[item.kind].inClass;
    case 'property':
      return propertyNoun(item).many;
    case 'strings':
      return joinOr(item.strings.map((s) => (s === '' ? 'empty' : s)));
    case 'class': {
      const inner = classBody(item);
      return item.negated ? `anything except ${inner}` : inner;
    }
  }
}

function classBody(c: ClassNode): string {
  const parts = c.items.map(classItemText);
  if (c.op === 'subtraction') return parts.join(' except ');
  if (c.op === 'intersection') return parts.join(' and also ');
  return joinOr(parts);
}

function classNoun(c: ClassNode): Noun {
  const body = classBody(c);
  return c.negated
    ? { one: `character except ${body}`, many: `characters except ${body}` }
    : { one: `character from ${body}`, many: `characters from ${body}` };
}

/** Singular and plural nouns for atoms simple enough to quantify inline. */
function nounOf(node: RegexNode, dotAll: boolean): Noun | null {
  switch (node.type) {
    case 'char': {
      const n = charName(node.value);
      return { one: n, many: n };
    }
    case 'dot':
      return dotAll
        ? {
            one: 'character, including newlines',
            many: 'characters, including newlines',
          }
        : { one: 'character', many: 'characters' };
    case 'escape-class':
      return ESCAPE_NOUN[node.kind];
    case 'property':
      return propertyNoun(node);
    case 'class':
      return classNoun(node);
    default:
      return null;
  }
}

function amount(q: QuantifierNode): { phrase: string; plural: boolean } {
  const { min, max } = q;
  if (min === max) return { phrase: `exactly ${min}`, plural: min !== 1 };
  if (max === Infinity) {
    if (min === 0) return { phrase: 'zero or more', plural: true };
    if (min === 1) return { phrase: 'one or more', plural: true };
    return { phrase: `at least ${min}`, plural: true };
  }
  if (min === 0 && max === 1) return { phrase: 'optional', plural: false };
  return { phrase: `between ${min} and ${max}`, plural: true };
}

function times(q: QuantifierNode): string {
  const { min, max } = q;
  if (min === max) return min === 1 ? 'exactly once' : `exactly ${min} times`;
  if (max === Infinity) {
    if (min === 0) return 'zero or more times';
    if (min === 1) return 'one or more times';
    return `at least ${min} times`;
  }
  if (min === 0 && max === 1) return 'optionally';
  return `between ${min} and ${max} times`;
}

const LAZY = ', as few as possible';

function groupPrefix(g: GroupNode): string {
  switch (g.kind) {
    case 'capture':
      return `Capture group ${g.index}`;
    case 'named':
      return `Named capture group ${g.name}`;
    case 'noncapture':
      return 'Group';
    case 'lookahead':
      return 'followed by';
    case 'negative-lookahead':
      return 'not followed by';
    case 'lookbehind':
      return 'preceded by';
    case 'negative-lookbehind':
      return 'not preceded by';
    case 'modifiers': {
      const m = g.modifiers!;
      const parts = [
        m.add && `with flags ${m.add}`,
        m.remove && `without flags ${m.remove}`,
      ].filter(Boolean);
      return `Group ${parts.join(' and ')}`;
    }
  }
}

class Describer {
  constructor(private readonly ast: RegexAst) {}

  private get flags() {
    return this.ast.flags;
  }

  /** Literal runs merge into one row ("literal abc"). */
  sequence(items: RegexNode[]): ExplainNode[] {
    const out: ExplainNode[] = [];
    let run: CharNode[] = [];
    const flush = () => {
      if (run.length === 0) return;
      out.push({
        label: `literal ${run.map((c) => charName(c.value)).join('')}`,
        start: run[0].start,
        end: run[run.length - 1].end,
        children: [],
      });
      run = [];
    };
    for (const item of items) {
      if (item.type === 'char' && charName(item.value) === item.value)
        run.push(item);
      else {
        flush();
        out.push(this.node(item));
      }
    }
    flush();
    return out;
  }

  alternation(a: AlternationNode): ExplainNode[] {
    if (a.alternatives.length === 1)
      return this.sequence(a.alternatives[0].items);
    return [
      {
        label: `one of ${a.alternatives.length} alternatives`,
        start: a.start,
        end: a.end,
        children: a.alternatives.map((alt, i) => {
          const rows = this.sequence(alt.items);
          const prefix = `alternative ${i + 1}`;
          if (rows.length === 0)
            return {
              label: `${prefix}: empty`,
              start: alt.start,
              end: alt.end,
              children: [],
            };
          if (rows.length === 1 && rows[0].children.length === 0)
            return { ...rows[0], label: `${prefix}: ${rows[0].label}` };
          return {
            label: prefix,
            start: alt.start,
            end: alt.end,
            children: rows,
          };
        }),
      },
    ];
  }

  node(n: RegexNode): ExplainNode {
    const row = (label: string, children: ExplainNode[] = []): ExplainNode => ({
      label,
      start: n.start,
      end: n.end,
      children,
    });
    switch (n.type) {
      case 'char':
        return row(`literal ${charName(n.value)}`);
      case 'dot':
        return row(`any ${nounOf(n, this.flags.includes('s'))!.one}`);
      case 'anchor': {
        const line = this.flags.includes('m');
        return row(
          n.kind === 'start'
            ? line
              ? 'start of a line'
              : 'start of the input'
            : line
              ? 'end of a line'
              : 'end of the input',
        );
      }
      case 'boundary':
        return row(n.negated ? 'not a word boundary' : 'word boundary');
      case 'escape-class':
        return row(`a ${ESCAPE_NOUN[n.kind].one}`);
      case 'property':
        return row(`a ${propertyNoun(n).one}`);
      case 'class':
        return row(`any ${classNoun(n).one}`);
      case 'backreference':
        return row(`the same text as group ${n.ref}`);
      case 'sequence':
        return row('sequence', this.sequence(n.items));
      case 'alternation':
        return row('alternatives', this.alternation(n));
      case 'group':
        return this.group(n);
      case 'quantifier':
        return this.quantifier(n);
    }
  }

  private group(g: GroupNode): ExplainNode {
    const prefix = groupPrefix(g);
    const rows = this.alternation(g.body);
    const base = { start: g.start, end: g.end, groupIndex: g.index };
    // Lookarounds read as a phrase ("preceded by literal $").
    const sep = g.kind.includes('look') ? ' ' : ': ';
    if (rows.length === 0)
      return { ...base, label: `${prefix}${sep}empty`, children: [] };
    if (rows.length === 1 && rows[0].children.length === 0)
      return {
        ...base,
        label: `${prefix}${sep}${rows[0].label}`,
        children: [],
      };
    return { ...base, label: prefix, children: rows };
  }

  private quantifier(q: QuantifierNode): ExplainNode {
    const lazy = q.lazy ? LAZY : '';
    const noun = nounOf(q.target, this.flags.includes('s'));
    if (noun) {
      const a = amount(q);
      return {
        label: `${a.phrase} ${a.plural ? noun.many : noun.one}${lazy}`,
        start: q.start,
        end: q.end,
        children: [],
      };
    }
    const inner = this.node(q.target);
    return {
      label: `${times(q)}${lazy}`,
      start: q.start,
      end: q.end,
      children: [inner],
    };
  }
}

/** The explanation tree for a parsed pattern ("Capture group 1: one or more digits"). */
export function describe(ast: RegexAst): ExplainNode {
  const d = new Describer(ast);
  return {
    label: `Pattern with ${ast.groupCount} capture group${ast.groupCount === 1 ? '' : 's'}`,
    start: 0,
    end: ast.pattern.length,
    children: d.alternation(ast.body),
  };
}
