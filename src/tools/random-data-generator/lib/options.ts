import type { MockField } from '@/shared/lib/data-formats/mock-schema';
import { ToolError } from '@/shared/lib/errors';
import type { Rng } from '@/shared/lib/prng';

export type { FieldOptions } from '@/shared/lib/data-formats/mock-schema';

/** A compiled field: the value for one row. */
export type Compiled = (row: number) => unknown;

/** A unique field may draw this many times its row count before failing. */
export const UNIQUE_ATTEMPTS = 10;
/** A field with `required: false` (legacy editor flag) is null this often. */
export const LEGACY_OPTIONAL_NULL_PCT = 20;

/** The field's null rate in percent (nullablePct, or the legacy flag). */
export function nullPct(f: MockField): number {
  if (f.nullablePct !== undefined) return f.nullablePct;
  return f.required === false ? LEGACY_OPTIONAL_NULL_PCT : 0;
}

/**
 * Wraps a field generator with its null rate and uniqueness. Unique values
 * are retried up to UNIQUE_ATTEMPTS times the row count in total, then the
 * field fails with the number of distinct values it managed. Nulls do not
 * count towards uniqueness.
 */
export function withOptions(
  f: MockField,
  gen: Compiled,
  count: number,
  rng: Rng,
): Compiled {
  const pct = nullPct(f);
  let out = gen;
  if (f.unique) {
    const seen = new Set<string>();
    let attempts = 0;
    const budget = UNIQUE_ATTEMPTS * Math.max(1, count);
    out = (row) => {
      for (;;) {
        const v = gen(row);
        const key = typeof v === 'string' ? v : JSON.stringify(v);
        if (!seen.has(key)) {
          seen.add(key);
          return v;
        }
        if (++attempts > budget)
          throw new ToolError(
            'INVALID_INPUT',
            `Could not make ${count} unique values for ${f.name} (only ${seen.size} possible)`,
          );
      }
    };
  }
  if (pct <= 0) return out;
  const inner = out;
  return (row) => (rng.next() * 100 < pct ? null : inner(row));
}
