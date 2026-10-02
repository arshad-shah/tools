import { normaliseLevel } from '../level';
import type { FormatSpec, LogEntry } from '../model';
import { toEpoch } from '../time';

const LEVEL_KEYS = ['level', 'lvl', 'severity', 'log.level', '@l', 'loglevel'];
const MSG_KEYS = ['msg', 'message', '@m', '@mt', 'log'];
const TIME_KEYS = ['time', 'timestamp', '@timestamp', 'ts', '@t', 'date'];
const COMPONENT_KEYS = ['logger', 'name', 'component', 'module', 'log.logger'];

/** A value by key, also through one nested object (ECS `log.level`). */
function pick(obj: Record<string, unknown>, keys: string[]) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null)
      return { key: k, value: obj[k] };
    const dot = k.indexOf('.');
    if (dot > 0) {
      const outer = obj[k.slice(0, dot)];
      if (outer && typeof outer === 'object') {
        const v = (outer as Record<string, unknown>)[k.slice(dot + 1)];
        if (v !== undefined && v !== null)
          return { key: k.slice(0, dot), value: v };
      }
    }
  }
  return null;
}

const asText = (v: unknown): string =>
  typeof v === 'string' ? v : JSON.stringify(v);

/** Maps a parsed JSON object onto a log entry. */
export function fromJsonObject(
  obj: Record<string, unknown>,
): Partial<LogEntry> {
  const level = pick(obj, LEVEL_KEYS);
  const msg = pick(obj, MSG_KEYS);
  const time = pick(obj, TIME_KEYS);
  const comp = pick(obj, COMPONENT_KEYS);
  const used = new Set([level?.key, msg?.key, time?.key, comp?.key]);
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj))
    if (!used.has(k) && v !== undefined) fields[k] = asText(v);
  const tsValue = time?.value;
  return {
    level: normaliseLevel(level ? (level.value as string | number) : undefined),
    message: msg ? asText(msg.value) : '',
    ts:
      typeof tsValue === 'number' || typeof tsValue === 'string'
        ? toEpoch(tsValue)
        : undefined,
    component: comp ? asText(comp.value) : undefined,
    fields,
  };
}

/** JSON lines: pino, bunyan, ECS, Serilog compact (spec §8.1). */
export const jsonl: FormatSpec = {
  id: 'jsonl',
  label: 'JSON lines',
  parse(line) {
    const t = line.trim();
    if (!t.startsWith('{') || !t.endsWith('}')) return null;
    try {
      const v: unknown = JSON.parse(t);
      if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
      return fromJsonObject(v as Record<string, unknown>);
    } catch {
      return null;
    }
  },
};
