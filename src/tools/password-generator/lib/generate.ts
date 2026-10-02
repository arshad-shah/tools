import { ToolError } from '@/shared/lib/errors';
import { randomInt, randomString, shuffle } from '@/shared/lib/crypto/random';

export const LOWER = 'abcdefghijklmnopqrstuvwxyz';
export const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const DIGITS = '0123456789';
export const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>/?~|';
/** Characters that are easy to confuse when read or typed (spec §8.4). */
export const AMBIGUOUS = 'Il1O0o';

export const MIN_LENGTH = 4;
export const MAX_LENGTH = 128;

export interface PinOptions {
  /** No digit the same as the one before it (no 11). */
  noRepeats: boolean;
  /** No run of three consecutive digits up or down (no 123 or 321). */
  noSequences: boolean;
}

export interface PasswordOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  /** Extra characters added to the pool. */
  include?: string;
  /** Characters never used. */
  exclude?: string;
  noLeadingSymbol: boolean;
  /** At least this many of each enabled class. */
  minPerClass: number;
  /** PIN mode: digits only, with these rules. */
  pin?: PinOptions;
}

const invalid = (message: string) => new ToolError('INVALID_INPUT', message);

const unique = (s: string) => [...new Set(s)].join('');

interface Pools {
  classes: { name: string; chars: string }[];
  all: string;
  symbols: Set<string>;
}

/** The character classes and pool after exclusions; throws when impossible. */
export function buildPools(opts: PasswordOptions): Pools {
  const drop = new Set([
    ...(opts.exclude ?? ''),
    ...(opts.excludeAmbiguous ? AMBIGUOUS : ''),
  ]);
  const keep = (s: string) => [...s].filter((c) => !drop.has(c)).join('');
  const wanted: [string, boolean, string][] = opts.pin
    ? [['digits', true, DIGITS]]
    : [
        ['lowercase', opts.lower, LOWER],
        ['uppercase', opts.upper, UPPER],
        ['digits', opts.digits, DIGITS],
        ['symbols', opts.symbols, SYMBOLS],
      ];
  const classes: Pools['classes'] = [];
  for (const [name, on, chars] of wanted) {
    if (!on) continue;
    const left = keep(chars);
    if (left === '')
      throw invalid(`The excluded characters remove every ${name} character`);
    classes.push({ name, chars: left });
  }
  const extra = opts.pin ? '' : keep(unique(opts.include ?? ''));
  if (classes.length === 0 && extra === '')
    throw invalid('Turn on at least one character set');
  const all = unique(classes.map((c) => c.chars).join('') + extra);
  const symbols = new Set([...all].filter((c) => !/[\p{L}\p{N}]/u.test(c)));
  return { classes, all, symbols };
}

function checkLength(opts: PasswordOptions, classes: number): void {
  if (
    !Number.isInteger(opts.length) ||
    opts.length < (opts.pin ? 3 : MIN_LENGTH) ||
    opts.length > MAX_LENGTH
  )
    throw invalid(
      `The length must be a whole number from ${opts.pin ? 3 : MIN_LENGTH} to ${MAX_LENGTH}`,
    );
  if (!Number.isInteger(opts.minPerClass) || opts.minPerClass < 0)
    throw invalid('The minimum per class must be a whole number');
  if (opts.minPerClass * classes > opts.length)
    throw invalid(
      `A length of ${opts.length} cannot hold ${opts.minPerClass} of each of ${classes} character sets`,
    );
}

/** A PIN drawn digit by digit, uniformly among the digits the rules allow. */
function generatePin(length: number, digits: string, pin: PinOptions): string {
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    const allowed = [...digits].map(Number).filter((d) => {
      const prev = out[i - 1];
      const prev2 = out[i - 2];
      if (pin.noRepeats && d === prev) return false;
      if (
        pin.noSequences &&
        prev !== undefined &&
        prev2 !== undefined &&
        Math.abs(d - prev) === 1 &&
        d - prev === prev - prev2
      )
        return false;
      return true;
    });
    if (allowed.length === 0)
      throw invalid('These PIN rules leave no digit to choose');
    out.push(allowed[randomInt(allowed.length)]);
  }
  return out.join('');
}

/**
 * A password from a CSPRNG with no modulo bias (spec §8.4): `minPerClass`
 * of every enabled class first, the rest drawn uniformly from the whole
 * pool, then a Fisher-Yates shuffle. Throws INVALID_INPUT naming the cause
 * when the options cannot be met.
 */
export function generatePassword(opts: PasswordOptions): string {
  const { classes, all, symbols } = buildPools(opts);
  checkLength(opts, classes.length);
  if (opts.pin) return generatePin(opts.length, all, opts.pin);

  const symbolOnly = classes.filter((c) =>
    [...c.chars].every((ch) => symbols.has(ch)),
  ).length;
  if (
    opts.noLeadingSymbol &&
    (symbols.size === all.length ||
      opts.minPerClass * symbolOnly >= opts.length)
  )
    throw invalid(
      'With only symbols in the pool, the password cannot start with a letter or digit',
    );
  for (;;) {
    const chars: string[] = [];
    for (const c of classes)
      chars.push(...randomString(c.chars, opts.minPerClass));
    chars.push(...randomString(all, opts.length - chars.length));
    const mixed = shuffle(chars);
    if (!opts.noLeadingSymbol || !symbols.has(mixed[0])) return mixed.join('');
    // Condition on a non-symbol first: one of them, chosen uniformly, leads.
    // A draw of symbols only (rare) is drawn again.
    const starts = mixed.flatMap((c, i) => (symbols.has(c) ? [] : [i]));
    if (starts.length === 0) continue;
    const i = starts[randomInt(starts.length)];
    [mixed[0], mixed[i]] = [mixed[i], mixed[0]];
    return mixed.join('');
  }
}
