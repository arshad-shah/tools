import { describe, expect, it } from 'vitest';
import { evaluateWithAngle } from './evaluate';

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
});
