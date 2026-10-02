import { describe, expect, it } from 'vitest';
import { toJsAccessor, toJsonPath, toXPath, type PathSeg } from './paths';

const key = (k: string): PathSeg => ({ t: 'key', k });
const idx = (i: number): PathSeg => ({ t: 'index', i });

describe('toJsonPath', () => {
  it.each<[PathSeg[], string]>([
    [[key('a'), key('b'), idx(0)], '$.a.b[0]'],
    [[key('first name')], "$['first name']"],
    [[key("it's")], "$['it\\'s']"],
    [[key('1')], "$['1']"],
    [[], '$'],
  ])('%j gives %s', (path, out) => {
    expect(toJsonPath(path)).toBe(out);
  });
});

describe('toJsAccessor', () => {
  it('uses dots for identifiers and brackets otherwise', () => {
    expect(toJsAccessor([key('a'), key('first name'), idx(0)])).toBe(
      "data.a['first name'][0]",
    );
    expect(toJsAccessor([key('$x')], 'doc')).toBe('doc.$x');
  });
});

describe('toXPath', () => {
  it('numbers repeated elements and omits [1] for unique ones', () => {
    expect(
      toXPath([
        { t: 'el', name: 'catalog', nth: 1, count: 1 },
        { t: 'el', name: 'book', nth: 2, count: 3 },
        { t: 'attr', name: 'id' },
      ]),
    ).toBe('/catalog/book[2]/@id');
    expect(
      toXPath([
        { t: 'el', name: 'r', nth: 1, count: 1 },
        { t: 'text', nth: 1 },
      ]),
    ).toBe('/r/text()[1]');
  });
});
