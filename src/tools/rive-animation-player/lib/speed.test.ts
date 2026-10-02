import { describe, expect, it } from 'vitest';
import type { Rive } from '@rive-app/react-canvas';
import { attachSpeedControl } from './speed';

function fakeRive() {
  const times: number[] = [];
  const rive = { _boundDraw: (t: number) => void times.push(t) };
  return { rive, times, frame: (t: number) => rive._boundDraw(t) };
}

describe('attachSpeedControl', () => {
  it('passes real time through at 1x', () => {
    const { rive, times, frame } = fakeRive();
    attachSpeedControl(rive as unknown as Rive);
    frame(1000);
    frame(1016);
    expect(times).toEqual([1000, 1016]);
  });

  it('runs the clock twice as fast at 2x and a quarter at 0.25x', () => {
    const { rive, times, frame } = fakeRive();
    const setSpeed = attachSpeedControl(rive as unknown as Rive)!;
    frame(1000);
    setSpeed(2);
    frame(1016);
    setSpeed(0.25);
    frame(1032);
    expect(times).toEqual([1000, 1032, 1036]);
  });

  it('returns null when the runtime has no draw hook', () => {
    expect(attachSpeedControl({} as unknown as Rive)).toBeNull();
  });
});
