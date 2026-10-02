import type {
  ClassItem,
  ClassNode,
  EscapeClassKind,
  PropertyNode,
  QuantifierNode,
  RegexNode,
} from './ast';

/** Nouns and phrases the explanation is built from. */

interface Noun {
  one: string;
  many: string;
}

export const ESCAPE_NOUN: Record<EscapeClassKind, Noun & { inClass: string }> =
  {
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

export const charName = (c: string): string => {
  if (NAMED_CHAR[c]) return NAMED_CHAR[c];
  const cp = c.codePointAt(0)!;
  if (cp < 0x20 || cp === 0x7f)
    return `control character U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
  return c;
};

const plural = (word: string) =>
  /(s|x|ch|sh)$/.test(word) ? `${word}es` : `${word}s`;

export function propertyNoun(p: PropertyNode): Noun {
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

export function classNoun(c: ClassNode): Noun {
  const body = classBody(c);
  return c.negated
    ? { one: `character except ${body}`, many: `characters except ${body}` }
    : { one: `character from ${body}`, many: `characters from ${body}` };
}

/** Singular and plural nouns for atoms simple enough to quantify inline. */
export function nounOf(node: RegexNode, dotAll: boolean): Noun | null {
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

export function amount(q: QuantifierNode): { phrase: string; plural: boolean } {
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

export function times(q: QuantifierNode): string {
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

export const LAZY = ', as few as possible';
