import * as math from 'mathjs';
import { ToolError } from '@/shared/lib/errors';
import type { AngleUnit } from '../types';

type Fn = (...args: never[]) => unknown;

const DEG = Math.PI / 180;

const call = (fn: unknown, ...args: unknown[]) =>
  (fn as (...a: unknown[]) => unknown)(...args);

// Plain numbers, matrices and complex numbers follow the switch. Units
// (30 deg, 1 rad) carry their own angle and go to mathjs untouched.
const isUnit = (x: unknown) => math.isUnit(x as never);
const toRad = (x: unknown) =>
  typeof x === 'number' ? x * DEG : isUnit(x) ? x : call(math.multiply, x, DEG);
const toDeg = (x: unknown) =>
  typeof x === 'number' ? x / DEG : call(math.multiply, x, 1 / DEG);

/** Exact results at whole multiples, so sin(180) is 0, not 1.2e-16. */
function exactDeg(name: 'sin' | 'cos' | 'tan', deg: number): number | null {
  if (!Number.isFinite(deg)) return null;
  const r = ((deg % 360) + 360) % 360;
  if ((name === 'sin' || name === 'tan') && r % 180 === 0) return 0;
  if (name === 'cos' && (r === 90 || r === 270)) return 0;
  return null;
}

const forward =
  (name: 'sin' | 'cos' | 'tan' | 'sec' | 'csc' | 'cot') => (x: never) => {
    if (
      typeof x === 'number' &&
      (name === 'sin' || name === 'cos' || name === 'tan')
    ) {
      const exact = exactDeg(name, x);
      if (exact !== null) return exact;
    }
    return call(math[name], toRad(x));
  };

const inverse =
  (name: 'asin' | 'acos' | 'atan' | 'asec' | 'acsc' | 'acot') => (x: never) =>
    toDeg(call(math[name], x));

/**
 * Trig functions that read and return degrees. Passed as the evaluation
 * scope, which mathjs resolves before its own functions, so the shared
 * mathjs instance is never modified.
 */
const DEGREE_SCOPE: Record<string, Fn> = {
  sin: forward('sin'),
  cos: forward('cos'),
  tan: forward('tan'),
  sec: forward('sec'),
  csc: forward('csc'),
  cot: forward('cot'),
  asin: inverse('asin'),
  acos: inverse('acos'),
  atan: inverse('atan'),
  asec: inverse('asec'),
  acsc: inverse('acsc'),
  acot: inverse('acot'),
  atan2: (y: never, x: never) => toDeg(call(math.atan2, y, x)),
};

const scopeFor = (angle: AngleUnit): Record<string, unknown> =>
  angle === 'deg' ? { ...DEGREE_SCOPE } : {};

/** mathjs `evaluate`, with trig honouring the degrees/radians switch. */
export function evaluateWithAngle(expr: string, angle: AngleUnit): unknown {
  return math.evaluate(expr, scopeFor(angle));
}

/** At most 14 significant digits, so 0.1 + 0.2 shows as 0.3. */
export function formatResult(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  return String(Number(v.toPrecision(14)));
}

const badExpression = (cause: unknown) =>
  new ToolError(
    'INVALID_INPUT',
    cause instanceof Error ? cause.message : 'Bad expression',
    { cause },
  );

/** A single number from `expr`, with clean display text. */
export function evaluateExpression(
  expr: string,
  angle: AngleUnit,
): { value: number; text: string } {
  let result: unknown;
  try {
    result = evaluateWithAngle(expr, angle);
  } catch (cause) {
    throw badExpression(cause);
  }
  if (typeof result !== 'number') {
    throw new ToolError(
      'INVALID_INPUT',
      'The expression did not produce a single number',
    );
  }
  const value = Number(result.toPrecision(14));
  return {
    value: Object.is(value, -0) ? 0 : value,
    text: formatResult(result),
  };
}

/**
 * Compiles `expr` once as a function of x (no string substitution, so exp,
 * max and xor keep working). NaN where it is undefined or not a number.
 */
export function compileFunction(
  expr: string,
  angle: AngleUnit,
): (x: number) => number {
  let code: math.EvalFunction;
  try {
    code = math.compile(expr);
  } catch (cause) {
    throw badExpression(cause);
  }
  const base = scopeFor(angle);
  return (x) => {
    try {
      const y: unknown = code.evaluate({ ...base, x });
      return typeof y === 'number' && Number.isFinite(y) ? y : NaN;
    } catch {
      return NaN;
    }
  };
}
