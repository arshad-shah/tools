import { describe, expect, it } from 'vitest';
import { fromPairs, toPairs } from './kv';
import type { KvRow } from './model';

describe('request rows and KeyValueEditor pairs', () => {
  it('round-trips secrets, files and descriptions', () => {
    const file = new File(['x'], 'a.txt');
    const rows: KvRow[] = [
      { id: '1', enabled: true, key: 'q', value: 'a', description: 'search' },
      { id: '2', enabled: false, key: 'token', value: 's', type: 'secret' },
      { id: '3', enabled: true, key: 'doc', value: '', type: 'file', file },
    ];
    const pairs = toPairs(rows);
    expect(pairs[1].secret).toBe(true);
    expect(pairs[2].file).toBe(file);
    const back = fromPairs(pairs, rows);
    expect(back[0]).toMatchObject({ type: 'text', description: 'search' });
    expect(back[1]).toMatchObject({ type: 'secret', enabled: false });
    expect(back[2]).toMatchObject({ type: 'file', file });
  });

  it('a detached file makes the row text again', () => {
    const rows: KvRow[] = [
      { id: '3', enabled: true, key: 'doc', value: '', type: 'file' },
    ];
    expect(
      fromPairs([{ id: '3', key: 'doc', value: 'v', enabled: true }], rows)[0]
        .type,
    ).toBe('text');
  });
});
