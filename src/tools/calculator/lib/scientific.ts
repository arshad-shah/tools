import * as math from 'mathjs';
import type { AngleUnit } from '../types';

/**
 * The result of a one-key scientific operation on the displayed number:
 * the new value plus the history line, or the error text shown as
 * `Error: <error>`.
 */
export type UnaryResult = { value: number; expr: string } | { error: string };

export type TrigFn =
  | 'sin'
  | 'cos'
  | 'tan'
  | 'asin'
  | 'acos'
  | 'atan'
  | 'sinh'
  | 'cosh'
  | 'tanh';

export type UnaryOp =
  | 'square'
  | 'squareRoot'
  | 'reciprocal'
  | 'factorial'
  | TrigFn;

const INVALID = { error: 'Invalid number' };

export function square(value: number): UnaryResult {
  if (isNaN(value)) return INVALID;
  const result = value * value;
  return { value: result, expr: `sqr(${value}) = ${result}` };
}

export function squareRoot(value: number): UnaryResult {
  if (isNaN(value)) return INVALID;
  if (value < 0) return { error: 'Square root of negative' };
  const result = Math.sqrt(value);
  return { value: result, expr: `√(${value}) = ${result}` };
}

export function reciprocal(value: number): UnaryResult {
  if (isNaN(value)) return INVALID;
  if (value === 0) return { error: 'Divide by zero' };
  const result = 1 / value;
  return { value: result, expr: `1/(${value}) = ${result}` };
}

export function factorial(value: number): UnaryResult {
  if (Number.isNaN(value) || !Number.isInteger(value) || value < 0) {
    return { error: 'Factorial domain error' };
  }
  let result = 1;
  for (let i = 2; i <= value; i++) {
    result *= i;
  }
  return { value: result, expr: `${value}! = ${result}` };
}

/** sin/cos/tan read the angle in `angleUnit`; asin/acos/atan return it. */
export function trig(
  fn: TrigFn,
  value: number,
  angleUnit: AngleUnit,
): UnaryResult {
  switch (fn) {
    case 'sin':
    case 'cos':
    case 'tan': {
      if (Number.isNaN(value)) return INVALID;
      const radians = angleUnit === 'deg' ? (value * Math.PI) / 180 : value;
      const result = Math[fn](radians);
      return { value: result, expr: `${fn}(${value}${angleUnit}) = ${result}` };
    }
    case 'asin':
    case 'acos': {
      if (Number.isNaN(value) || value < -1 || value > 1) {
        return {
          error: fn === 'asin' ? 'arcsin domain error' : 'arccos domain error',
        };
      }
      const raw = Math[fn](value);
      const result = angleUnit === 'deg' ? (raw * 180) / Math.PI : raw;
      return {
        value: result,
        expr: `${fn}(${value}) = ${result} ${angleUnit}`,
      };
    }
    case 'atan': {
      if (Number.isNaN(value)) return INVALID;
      const raw = Math.atan(value);
      const result = angleUnit === 'deg' ? (raw * 180) / Math.PI : raw;
      return { value: result, expr: `atan(${value}) = ${result} ${angleUnit}` };
    }
    case 'sinh':
    case 'cosh':
    case 'tanh': {
      if (Number.isNaN(value)) return INVALID;
      const result = math[fn](value);
      return { value: result, expr: `${fn}(${value}) = ${result}` };
    }
  }
}

export function applyUnary(
  op: UnaryOp,
  value: number,
  angleUnit: AngleUnit,
): UnaryResult {
  switch (op) {
    case 'square':
      return square(value);
    case 'squareRoot':
      return squareRoot(value);
    case 'reciprocal':
      return reciprocal(value);
    case 'factorial':
      return factorial(value);
    default:
      return trig(op, value, angleUnit);
  }
}
