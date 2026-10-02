import { describe, expect, it } from 'vitest';
import {
  compileFunction,
  evaluateExpression,
  evaluateWithAngle,
  formatResult,
} from './evaluate';

describe('evaluateWithAngle', () => {
  it('evaluates trig in degrees when the switch says degrees', () => {
    expect(evaluateWithAngle('sin(30)', 'deg')).toBeCloseTo(0.5, 12);
    expect(evaluateWithAngle('cos(60)', 'deg')).toBeCloseTo(0.5, 12);
    expect(evaluateWithAngle('tan(45)', 'deg')).toBeCloseTo(1, 12);
    expect(evaluateWithAngle('2*sin(90)+1', 'deg')).toBeCloseTo(3, 12);
  });

  it('returns inverse trig results in degrees', () => {
    expect(evaluateWithAngle('asin(0.5)', 'deg')).toBeCloseTo(30, 10);
    expect(evaluateWithAngle('acos(0.5)', 'deg')).toBeCloseTo(60, 10);
    expect(evaluateWithAngle('atan(1)', 'deg')).toBeCloseTo(45, 10);
    expect(evaluateWithAngle('atan2(1, 1)', 'deg')).toBeCloseTo(45, 10);
  });

  it('evaluates trig in radians when the switch says radians', () => {
    expect(evaluateWithAngle('sin(30)', 'rad')).toBeCloseTo(Math.sin(30), 12);
    expect(evaluateWithAngle('sin(pi/6)', 'rad')).toBeCloseTo(0.5, 12);
    expect(evaluateWithAngle('asin(1)', 'rad')).toBeCloseTo(Math.PI / 2, 12);
  });

  it('respects explicit units whatever the switch says', () => {
    expect(evaluateWithAngle('sin((pi / 6) rad)', 'deg')).toBeCloseTo(0.5, 12);
    expect(evaluateWithAngle('sin(30 deg)', 'rad')).toBeCloseTo(0.5, 12);
  });

  it('leaves non-trig maths alone', () => {
    expect(evaluateWithAngle('2+3*4', 'deg')).toBe(14);
    expect(evaluateWithAngle('sqrt(16)', 'deg')).toBe(4);
  });

  it('does not change the default mathjs instance', async () => {
    evaluateWithAngle('sin(30)', 'deg');
    const math = await import('mathjs');
    expect(math.evaluate('sin(30)')).toBeCloseTo(Math.sin(30), 12);
  });

  it('gives exact zeros at whole multiples in degrees', () => {
    expect(evaluateWithAngle('sin(180)', 'deg')).toBe(0);
    expect(evaluateWithAngle('cos(90)', 'deg')).toBe(0);
    expect(evaluateWithAngle('cos(270)', 'deg')).toBe(0);
    expect(evaluateWithAngle('tan(360)', 'deg')).toBe(0);
    expect(evaluateWithAngle('sin(-180)', 'deg')).toBe(0);
  });

  it('converts matrices and complex results in degrees too', () => {
    const m = evaluateWithAngle('map([30, 90], sin)', 'deg') as {
      toArray(): number[];
    };
    const [a, b] = m.toArray();
    expect(a).toBeCloseTo(0.5, 12);
    expect(b).toBeCloseTo(1, 12);
    // asin(2) is complex; its real part is 90 degrees, not pi/2.
    const z = evaluateWithAngle('asin(2)', 'deg') as { re: number };
    expect(z.re).toBeCloseTo(90, 10);
  });
});

describe('evaluateExpression', () => {
  it('returns the value and clean display text', () => {
    expect(evaluateExpression('sin(30)', 'deg')).toEqual({
      value: 0.5,
      text: '0.5',
    });
    expect(evaluateExpression('0.1 + 0.2', 'rad').text).toBe('0.3');
    expect(evaluateExpression('asin(0.5)', 'deg').text).toBe('30');
    expect(evaluateExpression('sin(180)', 'deg').text).toBe('0');
  });

  it('rejects bad and non-scalar expressions with INVALID_INPUT', () => {
    expect(() => evaluateExpression('2 +', 'rad')).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
    expect(() => evaluateExpression('[1, 2]', 'rad')).toThrow(/single number/);
    expect(() => evaluateExpression('asin(2)', 'deg')).toThrow(/single number/);
  });
});

describe('formatResult', () => {
  it('rounds to 14 significant digits', () => {
    expect(formatResult(1 / 3)).toBe('0.33333333333333');
    expect(formatResult(1.2246467991473532e-16)).toBe('1.2246467991474e-16');
    expect(formatResult(Infinity)).toBe('Infinity');
  });
});

describe('grapher', () => {
  it('compiles functions with the letter x inside names (exp, max)', () => {
    expect(compileFunction('exp(x)', 'rad')(1)).toBeCloseTo(Math.E);
    expect(compileFunction('max(x, 2)', 'rad')(5)).toBe(5);
  });

  it('plots trig with the angle switch', () => {
    expect(compileFunction('sin(x)', 'deg')(30)).toBeCloseTo(0.5, 12);
    expect(compileFunction('sin(x)', 'rad')(30)).toBeCloseTo(Math.sin(30), 12);
  });

  it('returns NaN where the function is undefined', () => {
    expect(compileFunction('1 / x', 'rad')(0)).toBeNaN();
    expect(compileFunction('sqrt(x)', 'rad')(-1)).toBeNaN();
  });

  it('throws INVALID_INPUT for an expression that cannot compile', () => {
    expect(() => compileFunction('2 +', 'rad')).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });
});
