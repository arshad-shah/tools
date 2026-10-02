import { describe, expect, it } from 'vitest';
import type { JobProgress } from '@/shared/state/useJob';
import mock from './mock';

const ctx = (events: JobProgress[] = []) => ({
  signal: new AbortController().signal,
  progress: (p: JobProgress) => events.push(p),
});

const schema = {
  tables: [{ name: 'rows', fields: [{ name: 'id', type: 'uuid' }] }],
};

describe('mock.generate handler', () => {
  it('generates seeded rows with progress', () => {
    const events: JobProgress[] = [];
    const a = mock['mock.generate'](ctx(events), schema, 3, 'abc');
    const b = mock['mock.generate'](ctx(), schema, 3, 'abc');
    expect(a.rows).toHaveLength(3);
    expect(a).toEqual(b);
    expect(events.at(-1)).toEqual({ done: 3, total: 3, label: 'Generating' });
  });

  it('validates the schema', () => {
    expect(() =>
      mock['mock.generate'](
        ctx(),
        { tables: [{ name: 'r', fields: [{ name: 'x', type: 'nope' }] }] },
        1,
        null,
      ),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('refuses a count over the cap', () => {
    expect(() => mock['mock.generate'](ctx(), schema, 1_000_001, null)).toThrow(
      expect.objectContaining({ code: 'TOO_LARGE' }),
    );
  });
});
