import { describe, expect, it } from 'vitest';
import type { RpcContext } from '@/shared/lib/worker-rpc';
import { textHandlers } from './index';
import jsonQuery from './json-query';

describe('json.query handler', () => {
  it('runs JSONPath and returns rows with paths and previews', () => {
    const rows = jsonQuery['json.query'](
      {} as RpcContext,
      { a: [1, 'x'] },
      '$.a[*]',
    );
    expect(rows.map((r) => [r.path, r.preview])).toEqual([
      ['$.a[0]', '1'],
      ['$.a[1]', '"x"'],
    ]);
  });

  it('throws a positioned error for a bad expression', () => {
    expect(() => jsonQuery['json.query']({} as RpcContext, {}, '$.a[')).toThrow(
      /column/,
    );
  });

  it('is registered on the text worker', () => {
    expect(typeof textHandlers['json.query']).toBe('function');
  });
});
