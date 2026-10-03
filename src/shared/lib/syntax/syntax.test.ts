import { describe, expect, it } from 'vitest';
import {
  languageForFile,
  LANGUAGES,
  tokenize,
  tokenizeLine,
  type LanguageId,
  type Token,
} from './tokenize';

/** [text, kind] pairs for the tokens of one line. */
const spans = (line: string, tokens: Token[]) =>
  tokens.map((t) => [line.slice(t.start, t.end), t.kind]);
const kindsOf = (lang: LanguageId, line: string, state = '') =>
  spans(line, tokenizeLine(lang, line, state).tokens);
const kindOf = (lang: LanguageId, text: string, needle: string) => {
  const lines = text.split('\n');
  const all = tokenize(lang, text).flatMap((ts, n) =>
    ts.map((t) => [lines[n].slice(t.start, t.end), t.kind]),
  );
  return all.find(([s]) => s === needle)?.[1];
};

describe('JSON', () => {
  it('gives each token its kind at the exact columns', () => {
    const line = '{"a": 1, "b": [true, null, "x\\"y"]}';
    const { tokens } = tokenizeLine('json', line);
    expect(tokens).toContainEqual({ start: 1, end: 4, kind: 'key' });
    expect(tokens).toContainEqual({ start: 6, end: 7, kind: 'number' });
    expect(tokens).toContainEqual({ start: 15, end: 19, kind: 'boolean' });
    expect(tokens).toContainEqual({ start: 21, end: 25, kind: 'null' });
    expect(tokens).toContainEqual({ start: 27, end: 33, kind: 'string' });
    expect(spans(line, tokens)).toContainEqual(['"x\\"y"', 'string']);
    expect(spans(line, tokens)).toContainEqual(['{', 'punct']);
  });
  it('tokenises a 1 MB line quickly', () => {
    const line = JSON.stringify(
      Array.from({ length: 40_000 }, (_, i) => ({ k: i, v: `s${i}`, b: true })),
    );
    expect(line.length).toBeGreaterThan(1_000_000);
    const t0 = performance.now();
    const { tokens } = tokenizeLine('json', line);
    expect(performance.now() - t0).toBeLessThan(300);
    expect(tokens.length).toBeGreaterThan(100_000);
  });
});

describe('JavaScript', () => {
  it('keeps template literal state across lines, including ${} expressions', () => {
    const text = 'const s = `a\n${x + 1} b\nc`; let y = 2;';
    const lines = tokenize('js', text);
    const l = text.split('\n');
    expect(spans(l[0], lines[0])).toEqual([
      ['const', 'keyword'],
      ['s', 'plain'],
      ['=', 'punct'],
      ['`', 'string'],
      ['a', 'string'],
    ]);
    expect(spans(l[1], lines[1])).toEqual([
      ['${', 'punct'],
      ['x', 'plain'],
      ['+', 'punct'],
      ['1', 'number'],
      ['}', 'punct'],
      [' b', 'string'],
    ]);
    expect(spans(l[2], lines[2])).toContainEqual(['c`', 'string']);
    expect(spans(l[2], lines[2])).toContainEqual(['let', 'keyword']);
  });
  it('carries block comments across lines', () => {
    const r1 = tokenizeLine('js', 'a /* start');
    expect(r1.state).toBe('B');
    const r2 = tokenizeLine('js', 'still */ b', r1.state);
    expect(spans('still */ b', r2.tokens)).toEqual([
      ['still */', 'comment'],
      ['b', 'plain'],
    ]);
    expect(r2.state).toBe('');
  });
  it('tells regex literals from division and finds calls', () => {
    expect(kindsOf('js', 'x = a / b / c')).not.toContainEqual([
      '/ b /',
      'regex',
    ]);
    // After the keyword `this`, "/" divides.
    for (const line of ['n = this / 2 / k', 'm = this/2/k'])
      expect(kindsOf('js', line).some(([, kind]) => kind === 'regex')).toBe(
        false,
      );
    expect(kindsOf('js', 'return /a/.test(s)')).toContainEqual([
      '/a/',
      'regex',
    ]);
    expect(kindsOf('js', 'x = /a[/]b/gi.test(s)')).toContainEqual([
      '/a[/]b/gi',
      'regex',
    ]);
    expect(kindsOf('js', 'foo(1); obj.if')).toEqual([
      ['foo', 'fn'],
      ['(', 'punct'],
      ['1', 'number'],
      [')', 'punct'],
      [';', 'punct'],
      ['obj', 'plain'],
      ['.', 'punct'],
      ['if', 'plain'],
    ]);
  });
});

describe('CSS', () => {
  it('carries block comments and finds properties and values', () => {
    const text =
      '/* a\nb */ .card:hover {\n  color: #fff;\n  margin: 2px calc(1rem);\n}';
    expect(kindOf('css', text, '/* a')).toBe('comment');
    expect(kindOf('css', text, 'b */')).toBe('comment');
    expect(kindOf('css', text, '.card')).toBe('attr');
    expect(kindOf('css', text, ':hover')).toBe('keyword');
    expect(kindOf('css', text, 'color')).toBe('attr');
    expect(kindOf('css', text, '#fff')).toBe('number');
    expect(kindOf('css', text, '2px')).toBe('number');
    expect(kindOf('css', text, 'calc')).toBe('fn');
  });
});

describe('XML and HTML', () => {
  it('HTML colours script and style bodies with the JS and CSS tokenisers', () => {
    const one = '<script>const a = 1;</script>';
    expect(kindsOf('html', one)).toEqual([
      ['<', 'punct'],
      ['script', 'tag'],
      ['>', 'punct'],
      ['const', 'keyword'],
      ['a', 'plain'],
      ['=', 'punct'],
      ['1', 'number'],
      [';', 'punct'],
      ['</', 'punct'],
      ['script', 'tag'],
      ['>', 'punct'],
    ]);
    const doc = [
      '<STYLE media="print">',
      '  a { color: red; }',
      '</style><p class="x">',
    ].join('\n');
    expect(kindOf('html', doc, 'color')).toBe('attr');
    expect(kindOf('html', doc, 'p')).toBe('tag');
    expect(kindOf('html', doc, 'class')).toBe('attr');
  });

  it('HTML carries an open script start tag and a script body across lines', () => {
    const doc = [
      '<script',
      '  type="module">',
      'let x = `a',
      'b`;</script>',
    ].join('\n');
    expect(kindOf('html', doc, 'let')).toBe('keyword');
    expect(kindOf('html', doc, 'b`')).toBe('string');
    // Comments and other tags do not start a script body.
    expect(kindOf('html', '<!-- <script> --> let', 'let')).toBeUndefined();
    expect(kindOf('html', '<scripts>let</scripts>', 'let')).toBeUndefined();
  });

  it('HTML tokens stay in order, inside the line and non-empty (fuzz)', () => {
    const parts = [
      '<script>',
      '</script>',
      '<style',
      '>',
      '</style>',
      '<p a="',
      '"',
      "'",
      '`',
      '/*',
      '*/',
      '<!--',
      '-->',
      ' x = 1;',
      '{',
      '}',
      '\n',
      '<SCRIPT type=x>',
      '//',
      '${',
      'a: b;',
    ];
    let seed = 7;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    for (let doc = 0; doc < 400; doc++) {
      const text = Array.from(
        { length: 12 },
        () => parts[rand(parts.length)],
      ).join('');
      const lines = text.split('\n');
      tokenize('html', text).forEach((tokens, n) => {
        let last = 0;
        for (const t of tokens) {
          expect(t.start).toBeGreaterThanOrEqual(last);
          expect(t.end).toBeGreaterThan(t.start);
          expect(t.end).toBeLessThanOrEqual(lines[n].length);
          last = t.end;
        }
      });
    }
  });

  it('XML keeps script and style element bodies as text', () => {
    expect(kindOf('xml', '<script>const a</script>', 'const')).toBeUndefined();
  });

  it('finds tags, attributes and strings', () => {
    expect(kindsOf('xml', '<a href="x" id=y>t</a>')).toEqual([
      ['<', 'punct'],
      ['a', 'tag'],
      ['href', 'attr'],
      ['=', 'punct'],
      ['"', 'string'],
      ['x"', 'string'],
      ['id', 'attr'],
      ['=', 'punct'],
      ['y', 'string'],
      ['>', 'punct'],
      ['</', 'punct'],
      ['a', 'tag'],
      ['>', 'punct'],
    ]);
  });
  it('carries comments, CDATA and open tags across lines', () => {
    const text = '<!-- one\ntwo --><r\n  k="v">&amp;<![CDATA[\nx]]></r>';
    expect(kindOf('xml', text, 'two -->')).toBe('comment');
    expect(kindOf('xml', text, 'k')).toBe('attr');
    expect(kindOf('xml', text, '&amp;')).toBe('keyword');
    expect(kindOf('xml', text, 'x]]>')).toBe('string');
    expect(kindOf('html', '<!DOCTYPE html>', '<!DOCTYPE')).toBe('keyword');
  });
});

describe('SQL', () => {
  it('finds keywords case-insensitively', () => {
    expect(
      kindsOf(
        'sql',
        "SeLeCt name, count(*) FROM t WHERE x = 'O''Brien' AND y IS NULL -- c",
      ),
    ).toEqual([
      ['SeLeCt', 'keyword'],
      ['name', 'plain'],
      [',', 'punct'],
      ['count', 'fn'],
      ['(', 'punct'],
      ['*', 'punct'],
      [')', 'punct'],
      ['FROM', 'keyword'],
      ['t', 'plain'],
      ['WHERE', 'keyword'],
      ['x', 'plain'],
      ['=', 'punct'],
      ["'O''Brien'", 'string'],
      ['AND', 'keyword'],
      ['y', 'plain'],
      ['IS', 'keyword'],
      ['NULL', 'null'],
      ['-- c', 'comment'],
    ]);
  });
});

describe('Regex', () => {
  it('finds groups, classes, escapes and quantifiers', () => {
    expect(kindsOf('regex', '^(?<year>\\d{4})-[0-9a-f]+?(?:x|y)$')).toEqual([
      ['^', 'keyword'],
      ['(?<year>', 'punct'],
      ['\\d', 'keyword'],
      ['{4}', 'number'],
      [')', 'punct'],
      ['[0-9a-f]', 'string'],
      ['+?', 'number'],
      ['(?:', 'punct'],
      ['|', 'punct'],
      [')', 'punct'],
      ['$', 'keyword'],
    ]);
  });
});

describe('Markdown', () => {
  it('finds headings, code fences (with state) and links', () => {
    const text =
      '# Title\nSee [docs](https://x.y) and `code`.\n```js\nlet a = 1;\n```\nafter';
    const lines = tokenize('markdown', text);
    const l = text.split('\n');
    expect(spans(l[0], lines[0])).toEqual([['# Title', 'keyword']]);
    expect(spans(l[1], lines[1])).toEqual([
      ['[docs]', 'tag'],
      ['(https://x.y)', 'attr'],
      ['`code`', 'string'],
    ]);
    expect(spans(l[2], lines[2])).toEqual([
      ['```', 'punct'],
      ['js', 'attr'],
    ]);
    expect(spans(l[3], lines[3])).toEqual([['let a = 1;', 'string']]);
    expect(spans(l[4], lines[4])).toEqual([['```', 'punct']]);
    expect(lines[5]).toEqual([]);
  });
});

describe('Log', () => {
  it('finds levels, timestamps and keys', () => {
    const line = '2024-05-01T12:00:00Z ERROR [api] took=12ms user="ann" warn';
    const k = kindsOf('log', line);
    expect(k).toContainEqual(['2024-05-01T12:00:00Z', 'number']);
    expect(k).toContainEqual(['ERROR', 'keyword']);
    expect(k).toContainEqual(['warn', 'keyword']);
    expect(k).toContainEqual(['took', 'key']);
    expect(k).toContainEqual(['"ann"', 'string']);
    expect(kindsOf('log', 'Information about errors')).toEqual([]);
  });
});

describe('YAML, CSV and HTTP', () => {
  it('YAML keys, scalars, comments and block scalars', () => {
    const text =
      'a: 1\nb: "x" # note\nc: |\n  text: not a key\nd: [true, null]';
    expect(kindOf('yaml', text, 'a')).toBe('key');
    expect(kindOf('yaml', text, '1')).toBe('number');
    expect(kindOf('yaml', text, '"x"')).toBe('string');
    expect(kindOf('yaml', text, '# note')).toBe('comment');
    expect(kindOf('yaml', text, 'text: not a key')).toBe('string');
    expect(kindOf('yaml', text, 'true')).toBe('boolean');
    expect(kindOf('yaml', text, 'null')).toBe('null');
  });
  it('CSV quoted fields span lines', () => {
    const lines = tokenize('csv', 'a,"b\nc",3');
    expect(lines[0]).toContainEqual({ start: 2, end: 4, kind: 'string' });
    expect(lines[1]).toEqual([
      { start: 0, end: 2, kind: 'string' },
      { start: 2, end: 3, kind: 'punct' },
      { start: 3, end: 4, kind: 'number' },
    ]);
  });
  it('HTTP start line, headers and body', () => {
    const text =
      'POST /api HTTP/1.1\nContent-Type: application/json\n\n{"a":1}';
    expect(kindOf('http', text, 'POST')).toBe('keyword');
    expect(kindOf('http', text, '/api')).toBe('attr');
    expect(kindOf('http', text, 'Content-Type')).toBe('key');
    expect(tokenize('http', text)[3]).toEqual([]);
    expect(kindOf('http', 'HTTP/1.1 404 Not Found', '404')).toBe('number');
  });
});

describe('registry', () => {
  it('lists languages and maps file names', () => {
    expect(LANGUAGES.map((l) => l.id)).toContain('markdown');
    expect(languageForFile('data.YML')).toBe('yaml');
    expect(languageForFile('notes')).toBe('plain');
    expect(tokenize('plain', 'anything')).toEqual([[]]);
  });
  it('never throws on odd input in any language', () => {
    const odd = [
      '',
      '"',
      '<',
      '/*',
      '`${',
      '[',
      '\\',
      '#',
      '*',
      "'",
      '{{{',
      'a: |',
    ];
    for (const l of LANGUAGES)
      for (const s of odd)
        expect(() => tokenize(l.id, `${s}\n${s}`)).not.toThrow();
  });
});
