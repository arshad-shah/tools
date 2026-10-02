import { ToolError } from '@/shared/lib/errors';
import { normaliseLevel } from './level';
import type { FormatSpec, LogEntry } from './model';
import { toEpoch } from './time';

export interface CustomFormatDef {
  name: string;
  pattern: string;
  flags: string;
}

const RESERVED = new Set(['ts', 'level', 'msg', 'component']);

/**
 * A FormatSpec from a regex with named groups (spec §8.1): `ts`, `level`,
 * `msg` and `component` map to the entry, every other group becomes a field.
 * Without a `msg` group the whole line is the message; a pattern with no
 * named group at all is refused.
 */
export function compileCustomFormat(def: CustomFormatDef): FormatSpec {
  let re: RegExp;
  try {
    re = new RegExp(def.pattern, def.flags.replace(/[gy]/g, ''));
  } catch (cause) {
    throw new ToolError(
      'INVALID_INPUT',
      cause instanceof Error ? cause.message : 'Invalid regular expression',
      { cause },
    );
  }
  const names = [...def.pattern.matchAll(/\(\?<([A-Za-z_$][\w$]*)>/g)].map(
    (m) => m[1],
  );
  if (names.length === 0)
    throw new ToolError('INVALID_INPUT', 'Add at least a named group msg');
  return {
    id: `custom:${def.name}`,
    label: def.name,
    parse(line) {
      const m = re.exec(line);
      if (!m) return null;
      const g = m.groups ?? {};
      const fields: Record<string, string> = {};
      for (const [k, v] of Object.entries(g))
        if (!RESERVED.has(k) && v !== undefined) fields[k] = v;
      const out: Partial<LogEntry> = {
        message: g.msg ?? line,
        level: normaliseLevel(g.level),
        ts: g.ts === undefined ? undefined : toEpoch(g.ts),
        component: g.component,
        fields,
      };
      return out;
    },
  };
}

/** The inline-test budget: 1 s per 1,000 lines (spec §8.1). */
export const testBudgetMs = (lines: number): number =>
  Math.max(1000, Math.ceil(lines / 1000) * 1000);
