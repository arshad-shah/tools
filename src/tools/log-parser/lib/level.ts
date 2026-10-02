const TOKEN =
  /^(?:\[\s*)?(FATAL|CRITICAL|CRIT|EMERG|ALERT|ERROR|ERR|SEVERE|WARNING|WARN|NOTICE|INFO|DEBUG|TRACE|VERBOSE|SUCCESS)(?:\s*\])?(?=[\s:|\]-]|$)/i;
const BRACKETED =
  /[[(<]\s*(FATAL|CRITICAL|CRIT|ERROR|ERR|SEVERE|WARNING|WARN|NOTICE|INFO|DEBUG|TRACE|VERBOSE|SUCCESS)\s*[\])>]/i;
// A level word as its own field after a timestamp ("12:00:01 ERROR db ...").
const AFTER_TIME =
  /^\S*\d[\d:.,TZ+-]*\d\S*(?:\s+\S*\d\S*)?\s+(FATAL|ERROR|ERR|WARNING|WARN|INFO|DEBUG|TRACE)\b(?![=:]\S)/i;
const KEYED = /\b(?:level|lvl|severity)=["']?([A-Za-z]+)/i;

/**
 * The level token of a line, upper-cased as written (spec §8.1): only an
 * anchored token at the start, a bracketed field, a word right after the
 * timestamp or a `level=` key counts, so "errors=0" never reads as an error.
 */
export function detectLevel(text: string): string | undefined {
  const t = text.trimStart();
  const m =
    TOKEN.exec(t) ?? BRACKETED.exec(t) ?? AFTER_TIME.exec(t) ?? KEYED.exec(t);
  return m ? m[1].toUpperCase() : undefined;
}

const CANONICAL: Record<string, string> = {
  fatal: 'fatal',
  critical: 'fatal',
  crit: 'fatal',
  emerg: 'fatal',
  emergency: 'fatal',
  alert: 'fatal',
  panic: 'fatal',
  error: 'error',
  err: 'error',
  severe: 'error',
  warning: 'warn',
  warn: 'warn',
  notice: 'info',
  info: 'info',
  information: 'info',
  informational: 'info',
  debug: 'debug',
  verbose: 'debug',
  trace: 'trace',
  success: 'success',
};

/** pino and bunyan numeric levels. */
const NUMERIC: [number, string][] = [
  [60, 'fatal'],
  [50, 'error'],
  [40, 'warn'],
  [30, 'info'],
  [20, 'debug'],
  [10, 'trace'],
];

/** A canonical level from a token, a name or a pino number. */
export function normaliseLevel(
  v: string | number | undefined | null,
): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'number' || /^\d+$/.test(v)) {
    const n = Number(v);
    return NUMERIC.find(([min]) => n >= min)?.[1] ?? 'trace';
  }
  return CANONICAL[v.toLowerCase()];
}

/** syslog severity 0 to 7 to a canonical level. */
export const syslogLevel = (severity: number): string =>
  severity <= 2
    ? 'fatal'
    : severity === 3
      ? 'error'
      : severity === 4
        ? 'warn'
        : severity === 7
          ? 'debug'
          : 'info';
