import { describe, expect, it } from 'vitest';
import { codec } from './codec';

describe('codec', () => {
  it('encodes and decodes', () => {
    expect(codec('a b&c', 'encode')).toEqual({
      output: 'a%20b%26c',
      error: '',
    });
    expect(codec('a%20b%26c', 'decode')).toEqual({
      output: 'a b&c',
      error: '',
    });
  });
  it('empty input is blank', () => {
    expect(codec('', 'decode')).toEqual({ output: '', error: '' });
  });
  it('a malformed escape clears the output and reports the error', () => {
    const r = codec('%E0%A4%A', 'decode');
    expect(r.output).toBe('');
    expect(r.error).not.toBe('');
  });
});
