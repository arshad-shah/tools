import type { Rive } from '@rive-app/react-canvas';
import type { LoopMode } from './timeline';

/**
 * Read-outs the public Rive API does not offer (durations, artboard sizes,
 * text runs). They rely on the runtime's private `animator` and `file`
 * members of the pinned version (see runtime.test.ts), and every reader
 * returns null or an empty list when a member is missing, so the UI then
 * hides the feature instead of guessing.
 */

interface NativeLinearAnimation {
  duration: number; // frames
  fps: number;
  loopValue: number;
  workStart?: number;
  workEnd?: number;
  enableWorkArea?: boolean;
}
interface PlayingAnimation {
  name: string;
  playing: boolean;
  scrubTo: number | null;
  animation: NativeLinearAnimation;
  instance: { time: number };
}
interface NativeArtboard {
  name: string;
  width: number;
  height: number;
  textValueRunCount?(): number;
  textValueRunByIndex?(i: number): { name: string; text: string } | null;
  delete?(): void;
}
interface Internals {
  animator?: { animations?: PlayingAnimation[] };
  artboard?: NativeArtboard | null;
  file?: {
    artboardCount?(): number;
    artboardByIndex?(i: number): NativeArtboard | null;
  } | null;
}

const internals = (rive: Rive) => rive as unknown as Internals;

const LOOP_MODES: LoopMode[] = ['once', 'loop', 'pingpong'];

export interface LinearInfo {
  /** Seconds (the work area when the file enables one). */
  duration: number;
  fps: number;
  /** How the file itself plays the animation. */
  fileMode: LoopMode;
}

function playing(rive: Rive, name: string): PlayingAnimation | null {
  const list = internals(rive).animator?.animations;
  return Array.isArray(list)
    ? (list.find((a) => a.name === name) ?? null)
    : null;
}

/** Duration, fps and loop mode of an instanced linear animation. */
export function linearInfo(rive: Rive, name: string): LinearInfo | null {
  const a = playing(rive, name)?.animation;
  if (!a || !(a.fps > 0) || !(a.duration > 0)) return null;
  const frames =
    a.enableWorkArea && a.workEnd !== undefined && a.workStart !== undefined
      ? a.workEnd - a.workStart
      : a.duration;
  return {
    duration: frames / a.fps,
    fps: a.fps,
    fileMode: LOOP_MODES[a.loopValue] ?? 'loop',
  };
}

/** The animation's current time in seconds, or null when not instanced. */
export function animationTime(rive: Rive, name: string): number | null {
  const t = playing(rive, name)?.instance?.time;
  return typeof t === 'number' ? t : null;
}

/**
 * Moves the animation to `time` on the next frame the runtime draws (the
 * same field `rive.scrub` sets, without its immediate redraw, so it is safe
 * to call from inside the runtime's Advance event).
 */
export function queueScrub(rive: Rive, name: string, time: number): boolean {
  const a = playing(rive, name);
  if (!a) return false;
  a.scrubTo = time;
  return true;
}

export function isAnimationPlaying(rive: Rive, name: string): boolean {
  return playing(rive, name)?.playing === true;
}

export interface ArtboardSize {
  name: string;
  width: number;
  height: number;
}

/** Every artboard's name and size, read from the file. */
export function artboardSizes(rive: Rive): ArtboardSize[] | null {
  const file = internals(rive).file;
  if (!file?.artboardCount || !file.artboardByIndex) return null;
  const out: ArtboardSize[] = [];
  for (let i = 0; i < file.artboardCount(); i++) {
    const ab = file.artboardByIndex(i);
    if (!ab) continue;
    out.push({ name: ab.name, width: ab.width, height: ab.height });
    // Each call makes a new native instance; free it.
    ab.delete?.();
  }
  return out;
}

export interface TextRun {
  name: string;
  text: string;
}

/** Text runs of the active artboard, or null when they cannot be listed. */
export function textRuns(rive: Rive): TextRun[] | null {
  const ab = internals(rive).artboard;
  if (!ab?.textValueRunCount || !ab.textValueRunByIndex) return null;
  const out: TextRun[] = [];
  for (let i = 0; i < ab.textValueRunCount(); i++) {
    const run = ab.textValueRunByIndex(i);
    if (run?.name) out.push({ name: run.name, text: run.text });
  }
  return out;
}
