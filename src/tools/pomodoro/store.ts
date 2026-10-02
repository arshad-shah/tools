import { createToolStore } from '@/shared/state/createToolStore';
import { newId } from '@/shared/lib/id';
import type { PomodoroState, Settings, TimerMode } from './types';
import * as session from './lib/session';
import { LEGACY_KEY, parseLegacyPomodoro } from './lib/legacy';

export interface PomodoroActions {
  /** A worker tick: the new remaining time, plus the day rollover check. */
  tick(timeLeft: number, now?: number): void;
  /** The timer reached zero: the session counts. */
  complete(now?: number): void;
  /** Skip: move on without counting the session. */
  skip(now?: number): void;
  /** Start/pause; a current task is optional ("Just focus"). */
  toggle(now?: number): void;
  /** On mount: correct a running timer from its wall-clock end. */
  resume(now?: number): void;
  selectMode(mode: TimerMode): void;
  resetTimer(): void;
  updateSettings(patch: Partial<Settings>): void;
  addTask(title: string): void;
  toggleTask(id: string): void;
  deleteTask(id: string): void;
  setCurrentTask(id: string | null): void;
  rollover(now?: number): void;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Store version 1 to 2: defaults for the new settings (long-break cycle,
 * notifications, sound, favicon ring), `completedWork` and the day log.
 */
export function migrateToV2(old: unknown): Partial<PomodoroState> {
  const state = isObject(old) ? old : {};
  const base = session.defaultState(Date.now());
  const out: Partial<PomodoroState> = {
    ...(state as Partial<PomodoroState>),
  };
  out.settings = {
    ...base.settings,
    ...(isObject(state.settings) ? (state.settings as Partial<Settings>) : {}),
  };
  if (!Array.isArray(state.history)) out.history = [];
  if (isObject(state.timer))
    out.timer = {
      completedWork: 0,
      ...(state.timer as unknown as PomodoroState['timer']),
    };
  return out;
}

/**
 * Timer, settings, tasks and stats. The timer is persisted too, so a running
 * timer resumes after a reload. Before store-kit this lived in Redux Persist's
 * `persist:pomodoro-store`, imported once.
 */
export const usePomodoroStore = createToolStore<PomodoroState, PomodoroActions>(
  {
    toolId: 'pomodoro',
    initial: session.defaultState(Date.now()),
    actions: (set, get) => ({
      tick: (timeLeft, now = Date.now()) =>
        set((s) => ({
          timer: { ...s.timer, timeLeft },
          stats: session.rolloverDay(s.stats, now),
        })),
      complete: (now = Date.now()) => set(session.completeSession(get(), now)),
      skip: (now = Date.now()) =>
        set(session.completeSession(get(), now, { skipped: true })),
      toggle: (now = Date.now()) => set(session.toggleTimer(get(), now)),
      resume: (now = Date.now()) => set(session.resumeTimer(get(), now)),
      selectMode: (mode) => set(session.selectMode(get(), mode)),
      resetTimer: () => set(session.resetTimer(get())),
      updateSettings: (patch) => set(session.applySettings(get(), patch)),
      addTask: (title) => set(session.addTask(get(), title, newId())),
      toggleTask: (id) => set(session.toggleTask(get(), id)),
      deleteTask: (id) => set(session.deleteTask(get(), id)),
      setCurrentTask: (id) =>
        set((s) => ({ timer: { ...s.timer, currentTask: id } })),
      rollover: (now = Date.now()) =>
        set((s) => ({ stats: session.rolloverDay(s.stats, now) })),
    }),
    persist: {
      version: 2,
      // v2 adds the long-break cycle, alerts and the per-day log.
      migrate: { 2: migrateToV2 },
    },
    legacy: {
      keys: [LEGACY_KEY],
      read: (raw) => parseLegacyPomodoro(raw[LEGACY_KEY], Date.now()),
    },
  },
);
