import type {
  PomodoroState,
  Settings,
  Stats,
  Task,
  TimerMode,
  TimerState,
} from '../types';
import { defaultState } from './session';

/** Where redux-persist (key 'pomodoro-store') kept the old Redux state. */
export const LEGACY_KEY = 'persist:pomodoro-store';

type Obj = Record<string, unknown>;

const isObject = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const bool = (v: unknown): v is boolean => typeof v === 'boolean';
const isMode = (v: unknown): v is TimerMode =>
  v === 'work' || v === 'shortBreak' || v === 'longBreak';

/** Copies each field of `from` that passes its guard over `base`. */
function mergeFields<T extends object>(
  base: T,
  from: Obj,
  guards: { [K in keyof T]: (v: unknown) => boolean },
): T {
  const out = { ...base };
  for (const key of Object.keys(guards) as (keyof T)[]) {
    const value = from[key as string];
    if (guards[key](value)) out[key] = value as T[keyof T];
  }
  return out;
}

function parseTimer(v: unknown, base: TimerState): TimerState | null {
  // Without a valid mode the remaining time means nothing: drop the slice.
  if (!isObject(v) || !isMode(v.mode)) return null;
  return mergeFields(base, v, {
    mode: isMode,
    timeLeft: num,
    isActive: bool,
    currentTask: (x) => x === null || typeof x === 'string',
  });
}

const parseSettings = (v: unknown, base: Settings): Settings | null =>
  isObject(v)
    ? mergeFields(base, v, {
        workDuration: num,
        shortBreakDuration: num,
        longBreakDuration: num,
        autoStartBreaks: bool,
        autoStartPomodoros: bool,
        soundEnabled: bool,
      })
    : null;

const parseStats = (v: unknown, base: Stats): Stats | null =>
  isObject(v)
    ? mergeFields(base, v, {
        dailyPomodoros: num,
        weeklyPomodoros: num,
        totalFocusTime: num,
        currentStreak: num,
        lastUpdate: num,
      })
    : null;

function parseTasks(v: unknown): Task[] | null {
  if (!Array.isArray(v)) return null;
  const base: Omit<Task, 'id' | 'title'> = {
    completed: false,
    pomodoros: 1,
    completedPomodoros: 0,
  };
  return v.flatMap((t): Task[] =>
    isObject(t) && typeof t.id === 'string' && typeof t.title === 'string'
      ? [
          mergeFields({ ...base, id: t.id, title: t.title }, t, {
            id: () => false,
            title: () => false,
            completed: bool,
            pomodoros: num,
            completedPomodoros: num,
          }),
        ]
      : [],
  );
}

/** A slice is itself a JSON string; one that does not parse is dropped. */
function decodeSlice(v: unknown): unknown {
  if (typeof v !== 'string') return undefined;
  try {
    return JSON.parse(v) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * redux-persist v6 stored `JSON.stringify({ timer: JSON.stringify(timer), …,
 * _persist: … })`. Each valid slice is merged field by field over the
 * defaults; invalid slices and fields fall back to them. Returns null when
 * nothing usable is left. A malformed outer document throws, so
 * createToolStore warns and keeps the legacy key.
 */
export function parseLegacyPomodoro(
  raw: string | null,
  now: number,
): PomodoroState | null {
  if (raw === null) return null;
  const outer: unknown = JSON.parse(raw);
  if (!isObject(outer)) return null;
  const base = defaultState(now);
  const timer = parseTimer(decodeSlice(outer.timer), base.timer);
  const settings = parseSettings(decodeSlice(outer.settings), base.settings);
  const tasks = parseTasks(decodeSlice(outer.tasks));
  const stats = parseStats(decodeSlice(outer.stats), base.stats);
  if (!timer && !settings && !tasks && !stats) return null;
  return {
    timer: timer ?? base.timer,
    settings: settings ?? base.settings,
    tasks: tasks ?? base.tasks,
    stats: stats ?? base.stats,
  };
}
