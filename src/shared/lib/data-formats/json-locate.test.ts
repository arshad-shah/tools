import { describe, expect, it } from 'vitest';
import {
  JsonLocateError,
  nodeAtOffset,
  offsetToLineCol,
  parseJsonWithLocations,
} from './json-locate';

/** Seeded generator of random JSON values (mulberry32). */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomString(r: () => number): string {
  const pool = [
    'a',
    'Z',
    ' ',
    '"',
    '\\',
    '\n',
    '\t',
    '/',
    String.fromCodePoint(0xe9),
    String.fromCodePoint(0x1f600),
    String.fromCharCode(0x7f),
    '__proto__',
  ];
  let s = '';
  const len = Math.floor(r() * 8);
  for (let i = 0; i < len; i++) s += pool[Math.floor(r() * pool.length)];
  return s;
}

function randomValue(r: () => number, depth: number): unknown {
  const pick = Math.floor(r() * (depth > 4 ? 4 : 7));
  switch (pick) {
    case 0:
      return randomString(r);
    case 1:
      return [0, -1, 1.5, 1e21, -2.5e-7, 123456789, 0.1][Math.floor(r() * 7)];
    case 2:
      return r() < 0.5;
    case 3:
      return null;
    case 4:
    case 5: {
      const o: Record<string, unknown> = {};
      const k = Math.floor(r() * 5);
      for (let i = 0; i < k; i++)
        o[randomString(r) || `k${i}`] = randomValue(r, depth + 1);
      return o;
    }
    default:
      return Array.from({ length: Math.floor(r() * 5) }, () =>
        randomValue(r, depth + 1),
      );
  }
}

/** JSON text with \u escapes and exponents mixed in, so both paths run. */
function serialise(v: unknown, r: () => number): string {
  const json = JSON.stringify(v, null, r() < 0.5 ? 2 : undefined);
  return json.replace(/\u00e9/g, (c) =>
    r() < 0.5 ? `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}` : c,
  );
}

const error = (text: string) => {
  try {
    parseJsonWithLocations(text);
  } catch (e) {
    return e as JsonLocateError;
  }
  throw new Error('expected a parse error');
};

describe('parseJsonWithLocations', () => {
  it('matches JSON.parse on 300 random documents', () => {
    const r = rng(42);
    for (let i = 0; i < 300; i++) {
      const text = serialise(randomValue(r, 0), r);
      expect(parseJsonWithLocations(text).value).toEqual(JSON.parse(text));
    }
  });

  it('keeps __proto__ as an own property', () => {
    const { value } = parseJsonWithLocations('{"__proto__": {"x": 1}}');
    expect(Object.keys(value as object)).toEqual(['__proto__']);
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
  });

  it('positions errors and names the token', () => {
    const e = error('{\n  "a": [1, 2,]\n}');
    expect(e).toBeInstanceOf(JsonLocateError);
    expect(e.code).toBe('INVALID_INPUT');
    expect([e.line, e.column]).toEqual([2, 14]);
    expect(e.message).toMatch(/Unexpected '\]' after ','/);
  });

  it('reports an unterminated string at its opening quote', () => {
    const e = error('{"a": "x');
    expect(e.message).toMatch(/^Unterminated string/);
    expect([e.line, e.column]).toEqual([1, 7]);
  });

  it.each([
    ['{"a" 1}', /Expected ':'/],
    ['{a: 1}', /property name in double quotes/],
    ['[1 2]', /Expected ',' or '\]'/],
    ['{"a": 1,}', /Unexpected '\}' after ','/],
    ['[01]', /Invalid number/],
    ['[1.]', /Invalid number/],
    ['"\\x"', /Invalid escape/],
    ['"\\u12"', /four hex digits/],
    ['"a\nb"', /Unescaped character U\+000A/],
    ['[1] 2', /after the JSON value/],
    ['', /end of input/],
    ['[', /end of input/],
    ['nul', /Unexpected 'n'/],
  ])('rejects %j', (text, message) => {
    expect(error(text).message).toMatch(message);
  });

  it('warns about duplicate keys and keeps the last value', () => {
    const { value, warnings } = parseJsonWithLocations('{"a":1,"a":2}');
    expect(value).toEqual({ a: 2 });
    expect(warnings).toEqual([
      { message: 'Duplicate key "a"', line: 1, column: 8 },
    ]);
  });

  it('refuses deep nesting without overflowing the stack', () => {
    const deep = '['.repeat(50_000) + ']'.repeat(50_000);
    expect(error(deep).message).toMatch(/Nesting deeper than 10000 levels/);
    expect(() => parseJsonWithLocations('[[[]]]', { maxDepth: 2 })).toThrow(
      /deeper than 2/,
    );
  });

  it('records offsets that slice to the source of each value', () => {
    const text = '{ "a" : [1, {"b": "x"}], "c": null }';
    const { root } = parseJsonWithLocations(text);
    const a = root.children![0];
    expect(a.key).toBe('a');
    expect(text.slice(a.node.start, a.node.end)).toBe('[1, {"b": "x"}]');
    expect(text.slice(a.node.keyStart, a.node.keyStart! + 3)).toBe('"a"');
    const b = a.node.children![1].node.children![0];
    expect(text.slice(b.node.start, b.node.end)).toBe('"x"');
    expect(text.slice(root.start, root.end)).toBe(text);
  });

  it('finds the path at an offset', () => {
    const text = '{"a":[1,2]}';
    const { root } = parseJsonWithLocations(text);
    expect(nodeAtOffset(root, text.indexOf('2'))).toEqual(['a', 1]);
    expect(nodeAtOffset(root, 1)).toEqual(['a']);
    expect(nodeAtOffset(root, 0)).toEqual([]);
  });

  it('accepts lone surrogate escapes like JSON.parse', () => {
    const text = '"\\ud800"';
    expect(parseJsonWithLocations(text).value).toBe(JSON.parse(text));
  });

  it('converts offsets to line and column', () => {
    expect(offsetToLineCol('ab\ncd', 4)).toEqual({ line: 2, column: 2 });
  });

  it('parses 5 MB quickly', () => {
    const rows = Array.from({ length: 70_000 }, (_, i) => ({
      id: i,
      name: `item ${i}`,
      tags: ['a', 'b'],
      price: i * 1.25,
      ok: i % 2 === 0,
    }));
    const text = JSON.stringify(rows);
    expect(text.length).toBeGreaterThan(5_000_000);
    const t0 = performance.now();
    parseJsonWithLocations(text);
    const ms = performance.now() - t0;
    console.info(`json-locate: ${Math.round(ms)} ms for 5 MB`);
    if (ms > 1500) console.warn(`json-locate: ${Math.round(ms)} ms for 5 MB`);
    expect(ms).toBeLessThan(4000);
  });
});
