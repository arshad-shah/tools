import type { Rive } from '@/shared/ui/adapters/rive-runtime';

type DrawFn = (time: number, onSecond?: () => void) => void;

/** The private member the runtime schedules with requestAnimationFrame. */
interface DrawHost {
  _boundDraw: DrawFn | null;
}

/**
 * Playback speed for any animation or state machine. The runtime has no
 * speed setting, so its frame callback gets a scaled clock: the time it is
 * handed advances `speed` times as fast as the real one. Relies on the
 * runtime's private `_boundDraw` (pinned version, see runtime.test.ts);
 * returns a setter, or null when the runtime no longer has that member.
 */
export function attachSpeedControl(
  rive: Rive,
): ((speed: number) => void) | null {
  const host = rive as unknown as DrawHost;
  const draw = host._boundDraw;
  if (typeof draw !== 'function') return null;
  let speed = 1;
  let lastReal: number | null = null;
  let virtual = 0;
  host._boundDraw = (time, onSecond) => {
    if (lastReal === null) virtual = time;
    else virtual += (time - lastReal) * speed;
    lastReal = time;
    // The runtime treats 0 as "no previous frame", so never hand it 0.
    draw(Math.max(virtual, Number.MIN_VALUE), onSecond);
  };
  return (next) => {
    speed = next;
  };
}
