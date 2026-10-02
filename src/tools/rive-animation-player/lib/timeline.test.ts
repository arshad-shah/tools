import { describe, expect, it } from 'vitest';
import { FRAME, formatTime, positionAt, stepFrame } from './timeline';

describe('positionAt', () => {
  it('loop wraps around', () => {
    expect(positionAt(2.5, 2, 'loop')).toEqual({ time: 0.5, done: false });
  });

  it('ping-pong runs back after the end', () => {
    expect(positionAt(1.5, 2, 'pingpong').time).toBe(1.5);
    expect(positionAt(2.5, 2, 'pingpong').time).toBe(1.5);
    expect(positionAt(4.5, 2, 'pingpong').time).toBe(0.5);
  });

  it('once stops at the end', () => {
    expect(positionAt(1, 2, 'once')).toEqual({ time: 1, done: false });
    expect(positionAt(3, 2, 'once')).toEqual({ time: 2, done: true });
  });

  it('handles an empty animation', () => {
    expect(positionAt(1, 0, 'loop')).toEqual({ time: 0, done: false });
  });
});

describe('stepFrame', () => {
  it('steps 1/60 s forward and back, clamped', () => {
    expect(stepFrame(0, 1, 2)).toBeCloseTo(FRAME, 10);
    expect(stepFrame(0.5, -1, 2)).toBeCloseTo(0.5 - FRAME, 10);
    expect(stepFrame(0, -1, 2)).toBe(0);
    expect(stepFrame(2, 1, 2)).toBe(2);
  });
});

describe('formatTime', () => {
  it('reads seconds, and minutes when long', () => {
    expect(formatTime(1.25)).toBe('1.25 s');
    expect(formatTime(75.5)).toBe('1 min 15.50 s');
  });
});
