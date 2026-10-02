import { ToolError } from '@/shared/lib/errors';
import type { LogEntry } from './model';

export interface FieldFilter {
  key: string;
  value: string;
  mode: 'include' | 'exclude';
}

/** The Log Viewer filter (spec §8.1). An empty `levels` set means all. */
export interface LogFilter {
  levels: ReadonlySet<string>;
  text?: { value: string; regex: boolean };
  exclude: string[];
  component?: string;
  /** Inclusive epoch-ms range; entries without a time are left out. */
  range?: [number, number];
  fields: FieldFilter[];
}

/** Level key for entries without a level, in `levels` and in counts. */
export const NO_LEVEL = 'none';

export const EMPTY_FILTER: LogFilter = {
  levels: new Set(),
  exclude: [],
  fields: [],
};

/** True when the filter keeps every entry. */
export const isEmptyFilter = (f: LogFilter): boolean =>
  f.levels.size === 0 &&
  !f.text?.value &&
  f.exclude.every((x) => !x) &&
  !f.component &&
  !f.range &&
  f.fields.length === 0;

/** A stable cache key for a filter (Sets sorted). */
export const filterKey = (f: LogFilter): string =>
  JSON.stringify([
    [...f.levels].sort(),
    f.text?.value ? f.text : null,
    f.exclude.filter(Boolean),
    f.component ?? '',
    f.range ?? null,
    f.fields,
  ]);

/**
 * A compiled predicate. A bad search regex is INVALID_INPUT, for the inline
 * error. Needs the parsed fields only when a field filter is set.
 */
export function compileFilter(f: LogFilter): {
  test(
    e: Pick<LogEntry, 'level' | 'raw' | 'component' | 'ts' | 'fields'>,
  ): boolean;
  needsFields: boolean;
} {
  let search: ((raw: string) => boolean) | null = null;
  if (f.text?.value) {
    if (f.text.regex) {
      let re: RegExp;
      try {
        re = new RegExp(f.text.value, 'i');
      } catch (cause) {
        throw new ToolError(
          'INVALID_INPUT',
          cause instanceof Error ? cause.message : 'Invalid regular expression',
          { cause },
        );
      }
      search = (raw) => re.test(raw);
    } else {
      const needle = f.text.value.toLowerCase();
      search = (raw) => raw.toLowerCase().includes(needle);
    }
  }
  const excludes = f.exclude.filter(Boolean).map((x) => x.toLowerCase());
  const component = f.component?.toLowerCase();
  return {
    needsFields: f.fields.length > 0,
    test(e) {
      if (f.levels.size > 0 && !f.levels.has(e.level ?? NO_LEVEL)) return false;
      if (component && !e.component?.toLowerCase().includes(component))
        return false;
      if (f.range) {
        if (e.ts === undefined || e.ts < f.range[0] || e.ts > f.range[1])
          return false;
      }
      if (search || excludes.length > 0) {
        const lower = e.raw.toLowerCase();
        if (excludes.some((x) => lower.includes(x))) return false;
        if (search && !search(e.raw)) return false;
      }
      for (const ff of f.fields) {
        const v = e.fields?.[ff.key];
        if (ff.mode === 'include' ? v !== ff.value : v === ff.value)
          return false;
      }
      return true;
    },
  };
}

/** `compileFilter(filter).test(entry)` for one-off checks. */
export const matchesFilter = (e: LogEntry, f: LogFilter): boolean =>
  compileFilter(f).test(e);
