import { describe, expect, it } from 'vitest';
import { inferColumnTypes } from './columns';
import { parseDelimited } from './parse';

describe('inferColumnTypes', () => {
  it('detects integer, decimal, boolean, date and text columns', () => {
    const { data, columns } = parseDelimited(
      [
        'id,price,active,day,zip,name',
        '1,1.5,true,2024-01-05,00123,Ada',
        '2,2,false,2024-02-29T10:00:00Z,00456,Bob',
        '3,,TRUE,,,',
      ].join('\n'),
      ',',
    );
    expect(inferColumnTypes(data, columns)).toEqual({
      id: 'integer',
      price: 'decimal',
      active: 'boolean',
      day: 'date',
      zip: 'text',
      name: 'text',
    });
  });

  it('makes a mixed column text', () => {
    const rows = [{ a: 1 }, { a: 'x' }];
    expect(inferColumnTypes(rows, ['a'])).toEqual({ a: 'text' });
  });

  it('treats a column with no values as text', () => {
    expect(inferColumnTypes([{ a: null }], ['a'])).toEqual({ a: 'text' });
  });

  it('rejects impossible dates', () => {
    expect(inferColumnTypes([{ d: '2024-13-01' }], ['d'])).toEqual({
      d: 'text',
    });
  });

  it('decides from the first 1,000 values only', () => {
    const rows = Array.from({ length: 1001 }, (_, i) => ({
      a: i < 1000 ? i : 'late text',
    }));
    expect(inferColumnTypes(rows, ['a'])).toEqual({ a: 'integer' });
  });
});
