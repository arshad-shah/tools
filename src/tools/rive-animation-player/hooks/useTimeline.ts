import { useEffect, useMemo, useRef, useState } from 'react';
import { EventType } from '@/shared/ui/adapters/rive-runtime';
import {
  animationTime,
  isAnimationPlaying,
  linearInfo,
  queueScrub,
} from '../lib/animator';
import { positionAt, stepFrame, type LoopMode } from '../lib/timeline';
import type { LoadedRive } from '../types';

/** Time read-outs per second while playing (the slider and the label). */
const READOUT_MS = 1000 / 30;

/**
 * Keeps a queued time just inside the end: the runtime wraps a looping
 * animation at its end, and removes a one-shot that reaches it.
 */
const inside = (t: number, duration: number) =>
  Math.min(Math.max(0, t), Math.max(0, duration - 1e-4));

/**
 * Timeline of the active linear animation: duration, current time, scrub,
 * frame step and the loop mode. A mode other than the file's own is played
 * by moving the animation to `positionAt(elapsed)` before every frame the
 * runtime draws (the elapsed time already includes the speed).
 */
export function useTimeline(loaded: LoadedRive | null, name: string | null) {
  const rive = loaded?.rive ?? null;
  // A new load or artboard (a new `loaded`) can bring a new animation.
  const info = useMemo(
    () => (loaded && name ? linearInfo(loaded.rive, name) : null),
    [loaded, name],
  );
  const key = `${loaded?.revision ?? 0}:${name ?? ''}`;
  const [state, setState] = useState({
    key,
    time: 0,
    mode: null as LoopMode | null,
  });
  let { time, mode } = state;
  if (state.key !== key) {
    // A new animation starts at its own time and loop mode.
    time = 0;
    mode = null;
    setState({ key, time, mode });
  }
  const effectiveMode = mode ?? info?.fileMode ?? 'loop';
  const driven = !!info && mode !== null && mode !== info.fileMode;

  const live = useRef({
    elapsed: 0,
    finishing: false,
    finished: false,
    lastReadout: 0,
  });
  const opts = useRef({
    driven,
    mode: effectiveMode,
    duration: info?.duration ?? 0,
  });
  useEffect(() => {
    opts.current = {
      driven,
      mode: effectiveMode,
      duration: info?.duration ?? 0,
    };
  });

  useEffect(() => {
    if (!rive || !name || !info) return;
    live.current = {
      elapsed: animationTime(rive, name) ?? 0,
      finishing: false,
      finished: false,
      lastReadout: 0,
    };
    const onAdvance = (e: { data?: unknown }) => {
      const l = live.current;
      const { driven, mode, duration } = opts.current;
      if (driven && isAnimationPlaying(rive, name)) {
        if (l.finishing) {
          // The last frame is on screen: stop like a one-shot does.
          l.finishing = false;
          l.finished = true;
          rive.pause(name);
        } else {
          if (l.finished) {
            l.finished = false;
            l.elapsed = 0; // played again after the end
          } else l.elapsed += typeof e.data === 'number' ? e.data : 0;
          const pos = positionAt(l.elapsed, duration, mode);
          queueScrub(rive, name, inside(pos.time, duration));
          l.finishing = pos.done;
        }
      }
      const now = performance.now();
      if (now - l.lastReadout < READOUT_MS) return;
      l.lastReadout = now;
      const t = animationTime(rive, name);
      if (t !== null) setState((s) => (s.time === t ? s : { ...s, time: t }));
    };
    rive.on(EventType.Advance, onAdvance);
    return () => rive.off(EventType.Advance, onAdvance);
  }, [rive, name, info]);

  /** Instances the animation again when a one-shot has ended. */
  const ensure = () => {
    if (!rive || !name) return false;
    if (animationTime(rive, name) === null) {
      rive.play(name);
      rive.pause(name);
    }
    return true;
  };

  const scrub = (t: number) => {
    if (!info || !ensure() || !rive || !name) return;
    const clamped = inside(t, info.duration);
    rive.scrub(name, clamped);
    live.current.elapsed = clamped;
    live.current.finished = false;
    live.current.finishing = false;
    setState((s) => ({ ...s, time: clamped }));
  };

  const step = (dir: 1 | -1) => {
    if (!info || !ensure() || !rive || !name) return;
    if (isAnimationPlaying(rive, name)) rive.pause(name);
    scrub(stepFrame(animationTime(rive, name) ?? time, dir, info.duration));
  };

  const setMode = (m: LoopMode) => {
    if (rive && name && m !== mode) {
      live.current.elapsed = animationTime(rive, name) ?? 0;
      live.current.finished = false;
      live.current.finishing = false;
    }
    setState((s) => ({ ...s, mode: m }));
  };

  return {
    /** null: no linear animation is active (a state machine, or nothing). */
    duration: info?.duration ?? null,
    fps: info?.fps ?? null,
    fileMode: info?.fileMode ?? null,
    time,
    mode: effectiveMode,
    setMode,
    scrub,
    step,
  };
}

export type TimelineState = ReturnType<typeof useTimeline>;
