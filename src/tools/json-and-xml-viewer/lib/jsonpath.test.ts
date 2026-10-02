import { describe, expect, it } from 'vitest';
import { toJsonPath } from './paths';
import { parseJsonPath, queryJsonPath } from './jsonpath';

/** The RFC 9535 bookstore. */
const store = {
  store: {
    book: [
      {
        category: 'reference',
        author: 'Nigel Rees',
        title: 'Sayings of the Century',
        price: 8.95,
      },
      {
        category: 'fiction',
        author: 'Evelyn Waugh',
        title: 'Sword of Honour',
        price: 12.99,
      },
      {
        category: 'fiction',
        author: 'Herman Melville',
        title: 'Moby Dick',
        isbn: '0-553-21311-3',
        price: 8.99,
      },
      {
        category: 'fiction',
        author: 'J. R. R. Tolkien',
        title: 'The Lord of the Rings',
        isbn: '0-395-19395-8',
        price: 22.99,
      },
    ],
    bicycle: { color: 'red', price: 399 },
  },
};
const books = store.store.book;
const authors = books.map((b) => b.author);
const values = (expr: string, doc: unknown = store) =>
  queryJsonPath(doc, expr).map((r) => r.value);

describe('queryJsonPath (RFC 9535 examples)', () => {
  it.each<[string, unknown[]]>([
    ['$.store.book[*].author', authors],
    ['$..author', authors],
    ['$.store.*', [books, store.store.bicycle]],
    ['$.store..price', [8.95, 12.99, 8.99, 22.99, 399]],
    ['$..book[2]', [books[2]]],
    ['$..book[-1]', [books[3]]],
    ['$..book[0,1]', [books[0], books[1]]],
    ['$..book[:2]', [books[0], books[1]]],
    ['$..book[?(@.isbn)]', [books[2], books[3]]],
    ['$..book[?(@.price < 10)]', [books[0], books[2]]],
    ['$..book[?@.price<10]', [books[0], books[2]]],
    [
      "$.store.book[?(@.category == 'fiction' && @.price > 20)].title",
      ['The Lord of the Rings'],
    ],
    ['$.store[\'bicycle\']["color"]', ['red']],
    ['$.store.book[?(!@.isbn)].price', [8.95, 12.99]],
    ['$.store.book[?(length(@.author) > 12)].price', [8.99, 22.99]],
    [
      '$.store.book[?(@.price == $.store.book[0].price)].title',
      ['Sayings of the Century'],
    ],
    ['$.store.book[1::2].price', [12.99, 22.99]],
    ['$.store.book[::-1].price', [22.99, 8.99, 12.99, 8.95]],
    ['$.store.book[?(@.price < 9 || @.price > 20)].price', [8.95, 8.99, 22.99]],
  ])('%s', (expr, expected) => {
    expect(values(expr)).toEqual(expected);
  });

  it('$..* selects every member value and array element', () => {
    expect(values('$..*')).toHaveLength(27);
  });

  it('returns normalised paths', () => {
    const [hit] = queryJsonPath(store, '$..book[1].title');
    expect(toJsonPath(hit.path)).toBe('$.store.book[1].title');
  });
});

describe('errors', () => {
  it('names the expected token and its column', () => {
    expect(() => parseJsonPath('$.store[')).toThrow("Expected ']' at column 9");
    expect(() => parseJsonPath('$..book[?(@.price <)]')).toThrow(
      /at column \d+/,
    );
    expect(() => parseJsonPath('store')).toThrow("Expected '$' at column 1");
    let err: unknown;
    try {
      parseJsonPath('$.a b');
    } catch (e) {
      err = e;
    }
    expect(err).toMatchObject({ code: 'INVALID_INPUT', column: 5 });
  });
});

describe('performance', () => {
  it('runs $..id over 100k elements in under 500 ms', () => {
    const doc = {
      items: Array.from({ length: 100_000 }, (_, id) => ({
        id,
        name: `n${id}`,
      })),
    };
    const t = performance.now();
    expect(queryJsonPath(doc, '$..id')).toHaveLength(100_000);
    expect(performance.now() - t).toBeLessThan(500);
  });
});
