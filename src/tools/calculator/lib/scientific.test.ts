import { describe, expect, it } from 'vitest';
import {
  applyUnary,
  factorial,
  reciprocal,
  square,
  squareRoot,
  trig,
} from './scientific';

const value = (r: ReturnType<typeof trig>) => (r as { value: number }).value;

describe('scientific unary ops', () => {
  it('square, square root and reciprocal with their history lines', () => {
    expect(square(3)).toEqual({ value: 9, expr: 'sqr(3) = 9' });
    expect(squareRoot(16)).toEqual({ value: 4, expr: '√(16) = 4' });
    expect(reciprocal(4)).toEqual({ value: 0.25, expr: '1/(4) = 0.25' });
  });

  it('reports the hook error strings', () => {
    expect(square(NaN)).toEqual({ error: 'Invalid number' });
    expect(squareRoot(NaN)).toEqual({ error: 'Invalid number' });
    expect(squareRoot(-4)).toEqual({ error: 'Square root of negative' });
    expect(reciprocal(NaN)).toEqual({ error: 'Invalid number' });
    expect(reciprocal(0)).toEqual({ error: 'Divide by zero' });
  });

  it('factorial of non-negative integers only', () => {
    expect(factorial(5)).toEqual({ value: 120, expr: '5! = 120' });
    expect(factorial(0)).toEqual({ value: 1, expr: '0! = 1' });
    for (const bad of [-1, 2.5, NaN]) {
      expect(factorial(bad)).toEqual({ error: 'Factorial domain error' });
    }
  });

  it('forward trig reads the angle unit', () => {
    expect(value(trig('sin', 90, 'deg'))).toBeCloseTo(1, 10);
    expect(value(trig('sin', Math.PI / 2, 'rad'))).toBeCloseTo(1, 10);
    expect(value(trig('cos', 0, 'deg'))).toBe(1);
    expect(value(trig('tan', 45, 'deg'))).toBeCloseTo(1, 10);
    expect(trig('cos', 0, 'rad')).toEqual({ value: 1, expr: 'cos(0rad) = 1' });
    expect(trig('sin', NaN, 'deg')).toEqual({ error: 'Invalid number' });
  });

  it('inverse trig returns the angle unit and checks the domain', () => {
    expect(value(trig('asin', 1, 'deg'))).toBeCloseTo(90, 10);
    expect(trig('acos', 1, 'rad')).toEqual({
      value: 0,
      expr: 'acos(1) = 0 rad',
    });
    expect(value(trig('atan', 1, 'deg'))).toBeCloseTo(45, 10);
    expect(trig('asin', 2, 'deg')).toEqual({ error: 'arcsin domain error' });
    expect(trig('acos', -1.5, 'deg')).toEqual({ error: 'arccos domain error' });
    expect(trig('asin', NaN, 'deg')).toEqual({ error: 'arcsin domain error' });
    expect(trig('atan', NaN, 'deg')).toEqual({ error: 'Invalid number' });
  });

  it('hyperbolic functions ignore the angle unit', () => {
    expect(trig('sinh', 0, 'deg')).toEqual({ value: 0, expr: 'sinh(0) = 0' });
    expect(trig('cosh', 0, 'deg')).toEqual({ value: 1, expr: 'cosh(0) = 1' });
    expect(value(trig('tanh', 1, 'rad'))).toBeCloseTo(Math.tanh(1), 12);
    expect(trig('tanh', NaN, 'rad')).toEqual({ error: 'Invalid number' });
  });

  it('applyUnary dispatches by op name', () => {
    expect(applyUnary('square', 2, 'deg')).toEqual(square(2));
    expect(applyUnary('factorial', 4, 'deg')).toEqual(factorial(4));
    expect(applyUnary('sin', 30, 'rad')).toEqual(trig('sin', 30, 'rad'));
  });
});
