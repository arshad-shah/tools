import { describe, expect, it } from 'vitest';
import { FLAT_KINDS } from '@/shared/lib/data-formats/json-flat';
import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import json from './json';

describe('json handler', () => {
  it('parses with locations', () => {
    const r = json['json.parseWithLocations']({} as RpcContext, '{"a":[1]}');
    expect(r.value).toEqual({ a: [1] });
    expect(r.root.children?.[0].key).toBe('a');
  });

  it('flattens offsets into transferred typed arrays', () => {
    const out = json['json.parseFlat'](
      {} as RpcContext,
      '{"a":[1,"x"],"b":null}',
    );
    expect(out).toBeInstanceOf(Transferred);
    const { flat } = out.value;
    expect([...flat.kinds].map((k) => FLAT_KINDS[k])).toEqual([
      'object',
      'array',
      'number',
      'string',
      'null',
    ]);
    expect([...flat.counts]).toEqual([2, 2, 0, 0, 0]);
    expect([...flat.keyStarts]).toEqual([-1, 1, -1, -1, 13]);
    expect(flat.keys).toEqual(['a', 'b']);
    expect(out.transfer).toHaveLength(5);
  });
});
