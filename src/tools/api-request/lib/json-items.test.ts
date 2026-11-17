import { describe, expect, it } from 'vitest';
import { hexDump } from './hex';
import { jsonItems } from './json-items';

describe('jsonItems', () => {
  it('builds only expanded branches, with sizes and values beside keys', () => {
    const value = { a: [1, 'x'], b: null };
    const closed = jsonItems('response', value, '$', new Set());
    expect(closed.data).toBe('{2}');
    expect(closed.hasChildren).toBe(true);
    expect(closed.children).toBeUndefined();

    const root = jsonItems('response', value, '$', new Set(['$', '$."a"']));
    const [a, b] = root.children!;
    expect([a.label, a.data, b.label, b.data]).toEqual([
      'a',
      '[2]',
      'b',
      'null',
    ]);
    expect(a.children!.map((n) => [n.id, n.data])).toEqual([
      ['$."a"[0]', '1'],
      ['$."a"[1]', '"x"'],
    ]);
    expect(b.hasChildren).toBeUndefined();
  });
});

describe('hexDump', () => {
  it('prints offset, hex in two groups of 8 and printable ASCII', () => {
    const bytes = new TextEncoder().encode('Hello, world!\n\u0001xyz');
    const [first, second] = hexDump(bytes).split('\n');
    expect(first).toBe(
      '00000000  48 65 6c 6c 6f 2c 20 77  6f 72 6c 64 21 0a 01 78  Hello, world!..x',
    );
    expect(second.startsWith('00000010  79 7a')).toBe(true);
    expect(second.endsWith('yz')).toBe(true);
  });

  it('stops at the limit', () => {
    expect(hexDump(new Uint8Array(100), 32).split('\n')).toHaveLength(2);
  });
});
