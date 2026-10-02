import type { CronFlavour } from './parse';

/** Used when an expression cannot be carried to another flavour. */
export const FALLBACK_UNIX = '0 0 * * *';

const split = (expr: string) => expr.trim().split(/\s+/);

/** Maps the numbers before any `/` in each list item of a day-of-week field. */
function mapDow(text: string, map: (n: number) => number): string {
  return text
    .split(',')
    .map((item) => {
      const [left, step] = item.split('/');
      const mapped = left.replace(/\d+/g, (d) => String(map(Number(d))));
      return step === undefined ? mapped : `${mapped}/${step}`;
    })
    .join(',');
}

/**
 * A Unix 5-field expression in `flavour`: with seconds it gains a leading
 * `0`; in Quartz it also gains a `?` (in day of week when that is `*`, else
 * in day of month, since Quartz cannot say "either") and Quartz's 1-based
 * day numbers (1 is Sunday). Macros are the same in every flavour.
 */
export function fromUnix(expr: string, flavour: CronFlavour): string {
  const t = expr.trim();
  if (flavour === 'unix' || t.startsWith('@')) return t;
  if (flavour === 'seconds') return `0 ${t}`;
  const parts = split(t);
  if (parts.length !== 5) return t;
  const [min, hour, dom, month, dow] = parts;
  const anyDay = dow === '*';
  const quartzDom = anyDay ? dom : '?';
  const quartzDow = anyDay ? '?' : mapDow(dow, (n) => (n % 7) + 1);
  return ['0', min, hour, quartzDom, month, quartzDow].join(' ');
}

/**
 * The Unix 5-field form of an expression, or null when it has the wrong
 * number of fields or uses Quartz specials (L, W, #) Unix cannot express.
 * The seconds field is dropped (and the Quartz year).
 */
export function toUnix(expr: string, flavour: CronFlavour): string | null {
  const t = expr.trim();
  if (t.startsWith('@')) return t;
  const parts = split(t);
  if (flavour === 'unix') return parts.length === 5 ? t : null;
  if (flavour === 'seconds')
    return parts.length === 6 ? parts.slice(1).join(' ') : null;
  if (parts.length !== 6 && parts.length !== 7) return null;
  const [, min, hour, dom, month, dow] = parts;
  if (/[LW#]/i.test(`${dom} ${dow}`)) return null;
  const unixDom = dom === '?' ? '*' : dom;
  const unixDow = dow === '?' ? '*' : mapDow(dow, (n) => n - 1);
  return [min, hour, unixDom, month, unixDow].join(' ');
}

/**
 * Carries an expression from one flavour to another through its Unix form;
 * one that cannot be carried becomes "daily at midnight" in the new flavour.
 */
export function convertFlavour(
  expr: string,
  from: CronFlavour,
  to: CronFlavour,
): string {
  return fromUnix(toUnix(expr, from) ?? FALLBACK_UNIX, to);
}
