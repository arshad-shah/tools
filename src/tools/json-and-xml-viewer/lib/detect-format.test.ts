import { describe, expect, it } from 'vitest';
import { detectFormat } from './detect-format';

describe('detectFormat', () => {
  it.each([
    [' {"a":1}', undefined, 'json'],
    ['[1]', undefined, 'json'],
    ['<?xml?><a/>', undefined, 'xml'],
    ['a: 1', undefined, 'yaml'],
    ['x', 'f.xml', 'xml'],
    ['{}', 'map.svg', 'xml'],
    ['<a/>', 'data.yml', 'yaml'],
    ['{"a":1}', 'notes.txt', 'json'],
    ['', undefined, 'json'],
  ] as const)('%j (%s) is %s', (text, name, out) => {
    expect(detectFormat(text, name)).toBe(out);
  });
});
