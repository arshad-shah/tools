import { all, create, type MathJsInstance } from 'mathjs';
import * as math from 'mathjs';
import { toToolError } from '@/shared/lib/errors';
import type { AngleUnit } from '../types';
import { angleScope } from './evaluate';

export interface SheetOptions {
  angle: AngleUnit;
  /** Significant digits shown (4 to 64); BigNumber mode also computes at it. */
  precision: number;
  /** Exact decimal arithmetic (0.1 + 0.2 is 0.3) via mathjs BigNumber. */
  bigNumber: boolean;
  notation: {
    /** Group integer digits with commas: 1,234,567. */
    thousands: boolean;
    /** Scientific notation from 10^sciAbove (and below 10^-7). */
    sciAbove: number;
  };
}

export type LineResult =
  | { ok: true; text: string; value: unknown }
  | { ok: false; error: string }
  | { ok: true; text: '' };

export interface SheetResult {
  results: LineResult[];
  /** The variables and functions the sheet assigned. */
  scope: Record<string, unknown>;
}

const DEFAULT = math as unknown as MathJsInstance;
const bigInstances = new Map<number, MathJsInstance>();
const GUARD_DIGITS = 4;

const clampPrecision = (p: number) =>
  Math.min(64, Math.max(4, Math.round(Number.isFinite(p) ? p : 14)));

function instanceFor(bigNumber: boolean, precision: number): MathJsInstance {
  if (!bigNumber) return DEFAULT;
  let m = bigInstances.get(precision);
  if (!m) {
    // Guard digits: computed a little past the shown precision, so
    // sin(30) in degrees rounds to 0.5 rather than 0.49999999999999.
    m = create(all, {
      number: 'BigNumber',
      precision: precision + GUARD_DIGITS,
    });
    bigInstances.set(precision, m);
  }
  return m;
}

const isComment = (line: string) => {
  const t = line.trim();
  return t === '' || t.startsWith('#') || t.startsWith('//');
};

/** Commas between thousands in integer digit runs (not after a point). */
const groupThousands = (text: string) =>
  text.replace(
    /(^|[^.\d])(\d{4,})/g,
    (_, pre: string, digits: string) =>
      pre + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
  );

function format(
  m: MathJsInstance,
  value: unknown,
  precision: number,
  notation: SheetOptions['notation'],
): string {
  if (typeof value === 'function') {
    const syntax = (value as { syntax?: unknown }).syntax;
    return typeof syntax === 'string' ? syntax : 'Function';
  }
  if (value === undefined) return '';
  const v = typeof value === 'number' && Object.is(value, -0) ? 0 : value;
  const text = m.format(v, {
    precision,
    lowerExp: -7,
    upperExp: notation.sciAbove,
  });
  return notation.thousands ? groupThousands(text) : text;
}

/**
 * Evaluates an expression sheet (spec §8.5, D12): each line in one shared
 * scope, so `a = 5` defines `a`; `ans` is the previous line's result and
 * `line3` the result of line 3. Comments (`#`, `//`) and blank lines give
 * empty results; an error stays on its line and later lines still run.
 */
export function evaluateSheet(
  lines: string[],
  { angle, precision, bigNumber, notation }: SheetOptions,
): SheetResult {
  const digits = clampPrecision(precision);
  const m = instanceFor(bigNumber, digits);
  const builtins = angleScope(angle, m);
  const scope: Record<string, unknown> = { ...builtins };
  const reserved = new Set(Object.keys(builtins));
  const results: LineResult[] = [];
  let ans: unknown;
  lines.forEach((line, i) => {
    if (isComment(line)) {
      results.push({ ok: true, text: '' });
      return;
    }
    try {
      if (ans !== undefined) scope.ans = ans;
      const value: unknown = m.evaluate(line, scope);
      const text = format(m, value, digits, notation);
      results.push({ ok: true, text, value });
      scope[`line${i + 1}`] = value;
      ans = value;
    } catch (e) {
      results.push({
        ok: false,
        error: toToolError(e, 'Bad expression').message,
      });
    }
  });
  const vars: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(scope))
    if (!reserved.has(k) && k !== 'ans' && !/^line\d+$/.test(k)) vars[k] = v;
  return { results, scope: vars };
}
