import { describe as group, expect, it } from 'vitest';
import { describe, type ExplainNode } from './describe';
import { parseRegex, RegexSyntaxError, type RegexNode } from './parser';

const explain = (p: string, f = '') => describe(parseRegex(p, f));
const labels = (n: ExplainNode): string[] => [
  n.label,
  ...n.children.flatMap(labels),
];

group('describe', () => {
  it('names groups and counts', () => {
    const tree = explain('(?<y>\\d{4})-(\\d{2})');
    expect(tree.children.map((c) => c.label)).toEqual([
      'Named capture group y: exactly 4 digits',
      'literal -',
      'Capture group 2: exactly 2 digits',
    ]);
    expect(tree.children[0].groupIndex).toBe(1);
  });

  it('describes lazy quantifiers', () => {
    expect(explain('a+?').children[0].label).toBe(
      'one or more a, as few as possible',
    );
  });

  it('describes negated classes', () => {
    expect(explain('[^a-z\\s]').children[0].label).toBe(
      'any character except a to z or whitespace',
    );
  });

  it('describes lookbehind', () => {
    const tree = explain('(?<=\\$)\\d+');
    expect(tree.children.map((c) => c.label)).toEqual([
      'preceded by literal $',
      'one or more digits',
    ]);
  });

  it('describes a script property', () => {
    expect(explain('\\p{Script=Greek}', 'u').children[0].label).toMatch(
      /Greek script/,
    );
  });

  it('describes v-flag set difference', () => {
    expect(explain('[\\p{L}--[a-z]]', 'v').children[0].label).toBe(
      'any character from letters except a to z',
    );
  });

  it('describes alternation, anchors and backreferences', () => {
    const all = labels(explain('^(a|bc)\\1$', 'm'));
    expect(all).toContain('start of a line');
    expect(all).toContain('Capture group 1');
    expect(all).toContain('one of 2 alternatives');
    expect(all).toContain('alternative 2: literal bc');
    expect(all).toContain('the same text as group 1');
    expect(all).toContain('end of a line');
  });

  it('describes quantified groups with a child row', () => {
    const q = explain('(?:ab)*').children[0];
    expect(q.label).toBe('zero or more times');
    expect(q.children[0].label).toBe('Group: literal ab');
  });
});

/** Every node in the AST, with its parent's span. */
function walk(
  n: RegexNode,
  visit: (n: RegexNode, parent: RegexNode | null) => void,
  parent: RegexNode | null = null,
): void {
  visit(n, parent);
  const kids: RegexNode[] =
    n.type === 'alternation'
      ? n.alternatives
      : n.type === 'sequence'
        ? n.items
        : n.type === 'group'
          ? [n.body]
          : n.type === 'quantifier'
            ? [n.target]
            : [];
  for (const k of kids) walk(k, visit, n);
}

group('spans', () => {
  const PATTERNS: [string, string][] = [
    ['(?<y>\\d{4})-(\\d{2})', ''],
    ['a+?b*c{2,3}', ''],
    ['[^a-z\\s]x', ''],
    ['(?<=\\$)\\d+|(?!no)\\w', ''],
    ['\\p{L}+[\\p{L}--[a-z]]', 'v'],
    ['\\u{1F600}\\k<n>(?<n>.)', 'u'],
  ];
  it.each(PATTERNS)('every node of /%s/%s slices to its source', (p, f) => {
    const ast = parseRegex(p, f);
    walk(ast.body, (n, parent) => {
      const text = p.slice(n.start, n.end);
      expect(n.start).toBeLessThanOrEqual(n.end);
      if (parent) {
        expect(n.start).toBeGreaterThanOrEqual(parent.start);
        expect(n.end).toBeLessThanOrEqual(parent.end);
      }
      if (n.type === 'group') {
        expect(text.startsWith('(')).toBe(true);
        expect(text.endsWith(')')).toBe(true);
      }
      if (n.type === 'class') {
        expect(text.startsWith('[')).toBe(true);
        expect(text.endsWith(']')).toBe(true);
      }
      if (n.type === 'char' && !text.startsWith('\\'))
        expect(text).toBe(n.value);
      if (n.type === 'quantifier')
        expect(text.startsWith(p.slice(n.target.start, n.target.end))).toBe(
          true,
        );
    });
  });
});

const accepts = (p: string, f: string) => {
  try {
    new RegExp(p, f);
    return true;
  } catch {
    return false;
  }
};

group('parity with new RegExp', () => {
  const VALID: [string, string][] = [
    ['abc', ''],
    ['a|b|c', ''],
    ['^\\d+$', 'm'],
    ['(a)(b)\\2\\1', ''],
    ['(?:x|y)+?', 'g'],
    ['(?<year>\\d{4})-\\k<year>', ''],
    ['(?=a)a', ''],
    ['(?!a)b', ''],
    ['(?<=a)b', ''],
    ['(?<!a)b', ''],
    ['[a-z0-9_]', 'i'],
    ['[^\\]]', ''],
    ['[\\b]', ''],
    ['\\bword\\B', ''],
    ['a{2}b{2,}c{2,5}', ''],
    ['a{', ''],
    ['a{1', ''],
    ['a{,5}', ''],
    [']', ''],
    ['}', ''],
    ['\\1', ''],
    ['\\8', ''],
    ['\\0', ''],
    ['\\012', ''],
    ['\\k', ''],
    ['\\k<a>', ''],
    ['\\c1', ''],
    ['\\cA', ''],
    ['[\\d-z]', ''],
    ['[\\c_]', ''],
    ['\\p{L}', ''],
    ['\\p{L}', 'u'],
    ['\\P{Lu}', 'u'],
    ['\\p{Script=Greek}', 'u'],
    ['\\u{1F600}', 'u'],
    ['\\uD83D\\uDE00', 'u'],
    ['\\x41\\u0041', ''],
    ['\\xZ', ''],
    ['(?=a)*', ''],
    ['[\\p{L}--[a-z]]', 'v'],
    ['[\\p{L}&&\\p{Lu}]', 'v'],
    ['[[a-z][0-9]]', 'v'],
    ['[\\q{abc|d}]', 'v'],
    ['[a-z]', 'v'],
    ['\\p{RGI_Emoji}', 'v'],
    ['.\\s\\S\\w\\W\\d\\D', 's'],
    ['\\/\\.\\*\\+\\?\\(\\)\\[\\]\\{\\}\\|\\^\\$', 'u'],
    ['[\\-]', 'u'],
    ['x*?y+?z??', ''],
    ['', ''],
  ];
  const INVALID: [string, string][] = [
    ['(', ''],
    [')', ''],
    ['[a', ''],
    ['*a', ''],
    ['a**', ''],
    ['{1}', ''],
    ['x{2,1}', ''],
    ['a{', 'u'],
    [']', 'u'],
    ['\\1', 'u'],
    ['\\c1', 'u'],
    ['[\\d-z]', 'u'],
    ['(?<a>x)\\k<b>', ''],
    ['(?<a>x)(?<a>y)', ''],
    ['(?<=a)*', ''],
    ['\\b+', ''],
    ['\\p{Nope}', 'u'],
    ['[z-a]', ''],
    ['[a&&&b]', 'v'],
    ['(?<1a>x)', ''],
  ];

  it('has 50 valid and 20 invalid cases', () => {
    expect(VALID).toHaveLength(50);
    expect(INVALID).toHaveLength(20);
  });

  it.each(VALID)('accepts /%s/%s like the engine', (p, f) => {
    expect(accepts(p, f)).toBe(true);
    expect(() => parseRegex(p, f)).not.toThrow();
  });

  it.each(INVALID)('rejects /%s/%s like the engine, with a column', (p, f) => {
    expect(accepts(p, f)).toBe(false);
    let err: unknown;
    try {
      parseRegex(p, f);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(RegexSyntaxError);
    expect((err as RegexSyntaxError).code).toBe('INVALID_INPUT');
    expect((err as RegexSyntaxError).column).toBeGreaterThan(0);
    expect((err as RegexSyntaxError).message).toMatch(/column \d+/);
  });

  // Duplicate named groups (ES2025) depend on the V8 version (Node 22
  // has none, Node 24 allows them in different alternatives): derive the
  // expectation from the running engine.
  const ENGINE_DUPLICATES = accepts('(?<a>x)|(?<a>y)', '');

  it('follows the running engine on a name repeated across alternatives', () => {
    const parse = () => parseRegex('(?<a>x)|(?<a>y)', '');
    if (ENGINE_DUPLICATES) expect(parse).not.toThrow();
    else expect(parse).toThrow(RegexSyntaxError);
    // The same alternative never repeats a name, in any engine.
    expect(accepts('(?<a>x)(?<a>y)', '')).toBe(false);
    expect(() => parseRegex('(?<a>x)(?<a>y)', '')).toThrow(RegexSyntaxError);
  });

  it('with duplicate named groups only separate alternatives repeat a name', () => {
    const dup = { duplicateNames: true };
    expect(() => parseRegex('(?<a>x)|(?<a>y)', '', dup)).not.toThrow();
    expect(() =>
      parseRegex('(?<a>x)|((?<a>y)|(?<a>z))', '', dup),
    ).not.toThrow();
    expect(() => parseRegex('(?<a>x)(?<a>y)', '', dup)).toThrow(
      RegexSyntaxError,
    );
    expect(() => parseRegex('(?:(?<a>x)|(?<a>y))(?<a>z)', '', dup)).toThrow(
      RegexSyntaxError,
    );
    expect(parseRegex('(?<a>x)|(?<a>y)', '', dup).groupNames).toEqual(['a']);
    const none = { duplicateNames: false };
    expect(() => parseRegex('(?<a>x)|(?<a>y)', '', none)).toThrow(
      RegexSyntaxError,
    );
  });

  it('rejects bad flags', () => {
    expect(() => parseRegex('a', 'uv')).toThrow();
    expect(() => parseRegex('a', 'gg')).toThrow();
    expect(() => parseRegex('a', 'x')).toThrow();
  });
});
