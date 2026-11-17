import { describe, expect, it } from 'vitest';
import { JsonInputError, lineColumn, parseInput } from './parse-input';

const fail = (text: string): JsonInputError => {
  try {
    parseInput(text);
  } catch (e) {
    if (e instanceof JsonInputError) return e;
    throw e;
  }
  throw new Error('expected a JsonInputError');
};

describe('parseInput', () => {
  it('blank input has no documents', () => {
    expect(parseInput('  \n ').documents).toEqual([]);
  });

  it('reads one document', () => {
    expect(parseInput('{"a": [1, 2]}').documents).toEqual([{ a: [1, 2] }]);
    expect(parseInput(' 42 ').documents).toEqual([42]);
  });

  it('reads JSON lines', () => {
    expect(parseInput('{"a":1}\n{"a":2}\n\n{"b":"}{"}\n').documents).toEqual([
      { a: 1 },
      { a: 2 },
      { b: '}{' },
    ]);
  });

  it('reads samples pasted one after another, including primitives', () => {
    expect(
      parseInput('{"a":1} {"a":2}[3] "x\\"y" true null 1.5').documents,
    ).toEqual([{ a: 1 }, { a: 2 }, [3], 'x"y', true, null, 1.5]);
  });

  it('reports a bad single document with its line and column', () => {
    const e = fail('{\n  "a": 1,\n  "b": ,\n}');
    expect(e.code).toBe('INVALID_INPUT');
    expect(e.line).toBe(3);
    expect(e.message).toMatch(/^Line 3, column \d+: /);
  });

  it('reports the bad document among several', () => {
    const e = fail('{"a":1}\n{"a":}\n');
    expect(e.line).toBe(2);
  });

  it('reports an unterminated document', () => {
    const e = fail('{"a": [1, 2');
    expect(e.line).toBe(1);
  });
});

describe('lineColumn', () => {
  it('counts lines and columns from 1', () => {
    expect(lineColumn('ab\ncd', 0)).toEqual({ line: 1, column: 1 });
    expect(lineColumn('ab\ncd', 4)).toEqual({ line: 2, column: 2 });
  });
});
