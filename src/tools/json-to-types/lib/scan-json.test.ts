import { describe, expect, it } from 'vitest';
import { scanValue } from './scan-json';

const end = (text: string, start = 0) => {
  const r = scanValue(text, start);
  if (!r.ok) throw new Error(r.message);
  return r.end;
};
const error = (text: string) => {
  const r = scanValue(text);
  if (r.ok) throw new Error('expected an error');
  return r;
};

describe('scanValue', () => {
  it('finds the end of each kind of value', () => {
    expect(end('{"a":[1,2,{"b":null}]} rest')).toBe(22);
    expect(end('  [] x')).toBe(4);
    expect(end('"a\\"b\\u00e9" x')).toBe(12);
    expect(end('-1.5e+3,')).toBe(7);
    expect(end('true false', 5)).toBe(10);
    expect(end('{}')).toBe(2);
  });

  it('agrees with JSON.parse on what it accepts', () => {
    const good = ['{"a":{"b":[1,{"c":"}"}]}}', '[[],[{}]]', '0', '"\\\\"'];
    for (const g of good) {
      expect(end(g)).toBe(g.length);
      expect(() => JSON.parse(g)).not.toThrow();
    }
  });

  it('reports where and why the JSON is invalid', () => {
    expect(error('{"a":1,}')).toEqual({
      ok: false,
      offset: 7,
      message: "Trailing comma before '}'",
    });
    expect(error('[1,]')).toMatchObject({
      offset: 3,
      message: "Expected a value before ']'",
    });
    expect(error('{a:1}')).toMatchObject({
      offset: 1,
      message: 'Expected a property name in double quotes',
    });
    expect(error('{"a" 1}')).toMatchObject({
      offset: 5,
      message: "Expected ':' after the property name",
    });
    expect(error('[1 2]')).toMatchObject({
      offset: 3,
      message: "Expected ',' or ']'",
    });
    expect(error('{"a":1 "b"')).toMatchObject({
      offset: 7,
      message: "Expected ',' or '}'",
    });
    expect(error('[1, 2')).toMatchObject({
      offset: 5,
      message: 'Unexpected end of the JSON',
    });
    expect(error('"abc')).toMatchObject({
      offset: 0,
      message: 'Unterminated string',
    });
    expect(error('"a\\x"')).toMatchObject({
      message: 'Invalid escape in a string',
    });
    expect(error('"\\u12"')).toMatchObject({
      message: 'Invalid unicode escape',
    });
    expect(error('"a\nb"')).toMatchObject({ offset: 2 });
    expect(error('[tru]')).toMatchObject({
      offset: 1,
      message: "Unexpected 't', expected a value",
    });
    expect(error("['a']")).toMatchObject({ offset: 1 });
    expect(error('-')).toMatchObject({ message: 'Invalid number' });
  });

  it('survives very deep nesting', () => {
    const deep = '['.repeat(100000) + ']'.repeat(100000);
    expect(end(deep)).toBe(200000);
  });
});
