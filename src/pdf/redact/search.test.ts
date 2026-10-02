import { describe, expect, it } from 'vitest';
import type { PageTextItems, TextItemGeom } from '@/pdf/render';
import { searchPages, type SearchQuery } from './search';

const item = (
  str: string,
  x: number,
  y: number,
  hasEOL = true,
): TextItemGeom => ({
  str,
  transform: [10, 0, 0, 10, x, y],
  width: str.length * 5,
  height: 10,
  fontName: 'f1',
  hasEOL,
});

const page = (...items: TextItemGeom[]): PageTextItems => ({
  items,
  styles: {
    f1: { ascent: 0.8, descent: -0.2, vertical: false, fontFamily: 'sans' },
  },
});

const q = (patch: Partial<SearchQuery>): SearchQuery => ({
  text: '',
  regex: false,
  caseSensitive: false,
  wholeWord: false,
  ...patch,
});

const run = (items: PageTextItems, query: Partial<SearchQuery>) =>
  searchPages([{ pageId: 'p1', pageNumber: 1, items }], q(query));

describe('searchPages', () => {
  it('finds text case-insensitively with one rect per line', () => {
    const m = run(page(item('My Secret plan', 72, 700)), { text: 'secret' });
    expect(m).toHaveLength(1);
    expect(m[0].text).toBe('Secret');
    expect(m[0].rects).toHaveLength(1);
    const r = m[0].rects[0];
    expect(r.x).toBeCloseTo(72 + 3 * 5 - 0.5, 6);
    expect(r.width).toBeCloseTo(6 * 5 + 1, 6);
    expect(r.y).toBeCloseTo(700 - 2 - 0.5, 6);
    expect(r.height).toBeCloseTo(10 + 1, 6);
    expect(m[0].context).toContain('My Secret plan');
  });

  it('splits a match across lines into one rect per line', () => {
    const m = run(page(item('top sec', 72, 700), item('ret end', 72, 680)), {
      text: 'sec\nret',
    });
    expect(m).toHaveLength(1);
    expect(m[0].rects).toHaveLength(2);
  });

  it('respects case and whole words', () => {
    const items = page(item('secretary secret Secret', 0, 0));
    expect(run(items, { text: 'secret', wholeWord: true })).toHaveLength(2);
    expect(run(items, { text: 'Secret', caseSensitive: true })).toHaveLength(1);
  });

  it('runs regular expressions', () => {
    const m = run(page(item('In 1999 and 2024', 0, 0)), {
      text: '\\d{4}',
      regex: true,
    });
    expect(m.map((x) => x.text)).toEqual(['1999', '2024']);
  });

  it('reports an invalid pattern', () => {
    expect(() =>
      run(page(item('x', 0, 0)), { text: '(', regex: true }),
    ).toThrow('That search pattern is not valid');
  });

  it('finds validated presets only', () => {
    const items = page(
      item('IBAN IE29AIBK93115212345678 bad IE28AIBK93115212345678', 0, 0),
      item('card 4111 1111 1111 1111 and 4111 1111 1111 1112', 0, -20),
      item('call 555 1234 or +353 1 234 5678', 0, -40),
      item('mail a.b@example.com', 0, -60),
    );
    expect(run(items, { preset: 'iban' }).map((m) => m.text)).toEqual([
      'IE29AIBK93115212345678',
    ]);
    expect(run(items, { preset: 'card' }).map((m) => m.text)).toEqual([
      '4111 1111 1111 1111',
    ]);
    expect(run(items, { preset: 'phone' }).map((m) => m.text)).toEqual([
      '+353 1 234 5678',
    ]);
    expect(run(items, { preset: 'email' }).map((m) => m.text)).toEqual([
      'a.b@example.com',
    ]);
  });
});

describe('searchPages form fields', () => {
  it('finds a term in a form field value and marks the whole widget', () => {
    const m = searchPages(
      [
        {
          pageId: 'p1',
          pageNumber: 1,
          items: page(item('Nothing here', 72, 700)),
          fields: [
            {
              name: 'account',
              value: 'ACC-1234',
              rect: { x: 72, y: 650, width: 200, height: 20 },
            },
          ],
        },
      ],
      q({ text: 'acc-1234' }),
    );
    expect(m).toHaveLength(1);
    expect(m[0].text).toBe('ACC-1234');
    expect(m[0].rects).toEqual([{ x: 71.5, y: 649.5, width: 201, height: 21 }]);
    expect(m[0].context).toBe('Form field account: ACC-1234');
    expect(m[0].context.slice(m[0].contextStart)).toMatch(/^ACC-1234/);
  });

  it('skips fields whose value does not match', () => {
    const m = searchPages(
      [
        {
          pageId: 'p1',
          pageNumber: 1,
          items: page(),
          fields: [
            {
              name: 'a',
              value: 'other',
              rect: { x: 0, y: 0, width: 5, height: 5 },
            },
          ],
        },
      ],
      q({ text: 'secret' }),
    );
    expect(m).toEqual([]);
  });
});
