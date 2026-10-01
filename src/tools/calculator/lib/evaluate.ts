import * as math from 'mathjs';
import type { AngleUnit } from '../types';

type Fn = (...args: never[]) => unknown;

const DEG = Math.PI / 180;
// Plain numbers follow the switch; units (30 deg, 1 rad), complex numbers
// and matrices go to mathjs untouched.
const toRad = (x: unknown) => (typeof x === 'number' ? x * DEG : x);
const toDeg = (x: unknown) => (typeof x === 'number' ? x / DEG : x);

const call = (fn: unknown, ...args: unknown[]) =>
  (fn as (...a: unknown[]) => unknown)(...args);

/**
 * Trig functions that read and return degrees. Passed as the evaluation
 * scope, which mathjs resolves before its own functions, so the shared
 * mathjs instance is never modified.
 */
const DEGREE_SCOPE: Record<string, Fn> = {
  sin: (x: never) => call(math.sin, toRad(x)),
  cos: (x: never) => call(math.cos, toRad(x)),
  tan: (x: never) => call(math.tan, toRad(x)),
  sec: (x: never) => call(math.sec, toRad(x)),
  csc: (x: never) => call(math.csc, toRad(x)),
  cot: (x: never) => call(math.cot, toRad(x)),
  asin: (x: never) => toDeg(call(math.asin, x)),
  acos: (x: never) => toDeg(call(math.acos, x)),
  atan: (x: never) => toDeg(call(math.atan, x)),
  asec: (x: never) => toDeg(call(math.asec, x)),
  acsc: (x: never) => toDeg(call(math.acsc, x)),
  acot: (x: never) => toDeg(call(math.acot, x)),
  atan2: (y: never, x: never) => toDeg(call(math.atan2, y, x)),
};

/** mathjs `evaluate`, with trig honouring the degrees/radians switch. */
export function evaluateWithAngle(expr: string, angle: AngleUnit): unknown {
  return angle === 'deg'
    ? math.evaluate(expr, { ...DEGREE_SCOPE })
    : math.evaluate(expr);
}
