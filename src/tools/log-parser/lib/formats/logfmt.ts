import { normaliseLevel } from '../level';
import type { FormatSpec } from '../model';
import { toEpoch } from '../time';

const PAIR = /([\w.@/-]+)=("(?:[^"\\]|\\.)*"|\S*)/g;

/** `key=value` pairs; quoted values may hold spaces and escapes. */
export function parseLogfmt(line: string): Record<string, string> | null {
  const out: Record<string, string> = {};
  let count = 0;
  let consumed = 0;
  for (const m of line.matchAll(PAIR)) {
    const raw = m[2];
    out[m[1]] = raw.startsWith('"')
      ? raw
          .slice(1, -1)
          .replace(/\\(.)/g, (_, c: string) => (c === 'n' ? '\n' : c))
      : raw;
    count++;
    consumed += m[0].length;
  }
  // Mostly pairs, not prose with an occasional "=".
  if (count < 2 || consumed < line.replace(/\s/g, '').length * 0.6) return null;
  return out;
}

/** logfmt (Heroku, Go kit, logrus text). */
export const logfmt: FormatSpec = {
  id: 'logfmt',
  label: 'logfmt',
  parse(line) {
    const kv = parseLogfmt(line);
    if (!kv) return null;
    const {
      level,
      lvl,
      msg,
      message,
      time,
      ts,
      t,
      logger,
      component,
      ...rest
    } = kv;
    return {
      level: normaliseLevel(level ?? lvl),
      message: msg ?? message ?? '',
      ts: toEpoch(time ?? ts ?? t),
      component: component ?? logger,
      fields: rest,
    };
  },
};
