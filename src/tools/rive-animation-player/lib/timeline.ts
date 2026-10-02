export const SPEEDS = [0.25, 0.5, 1, 1.5, 2] as const;
export type Speed = (typeof SPEEDS)[number];

export type LoopMode = 'loop' | 'pingpong' | 'once';

/** One frame step (the `,` and `.` keys). */
export const FRAME = 1 / 60;

/**
 * Where a linear animation of `duration` seconds is after `elapsed` seconds
 * of playback in `mode`. `done` is only ever true for `once`.
 */
export function positionAt(
  elapsed: number,
  duration: number,
  mode: LoopMode,
): { time: number; done: boolean } {
  if (!(duration > 0)) return { time: 0, done: mode === 'once' };
  const e = Math.max(0, elapsed);
  switch (mode) {
    case 'once':
      return e >= duration
        ? { time: duration, done: true }
        : { time: e, done: false };
    case 'loop':
      return { time: e % duration, done: false };
    case 'pingpong': {
      const phase = e % (2 * duration);
      return {
        time: phase <= duration ? phase : 2 * duration - phase,
        done: false,
      };
    }
  }
}

/** One frame forward (`dir` 1) or back (-1), clamped to the animation. */
export function stepFrame(time: number, dir: 1 | -1, duration: number): number {
  const next = Math.round((time + dir * FRAME) * 60) / 60;
  return Math.min(Math.max(0, next), Math.max(0, duration));
}

/** `1.25 s`; durations under a minute only need seconds. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  if (s < 60) return `${s.toFixed(2)} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${(s - m * 60).toFixed(2)} s`;
}
