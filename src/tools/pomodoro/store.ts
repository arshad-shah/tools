import { createToolStore } from '@/shared/state/createToolStore';
import { newId } from '@/shared/lib/id';
import type { PomodoroState, Settings, TimerMode } from './types';
import * as session from './lib/session';
import { LEGACY_KEY, parseLegacyPomodoro } from './lib/legacy';

export interface PomodoroActions {
  /** A worker tick: the new remaining time, plus the day rollover check. */
  tick(timeLeft: number, now?: number): void;
  /** The session ended (timer reached zero or Skip). */
  complete(now?: number): void;
  /** Start/pause; starting work without a current task is a no-op. */
  toggle(): void;
  selectMode(mode: TimerMode): void;
  resetTimer(): void;
  updateSettings(patch: Partial<Settings>): void;
  addTask(title: string): void;
  toggleTask(id: string): void;
  deleteTask(id: string): void;
  setCurrentTask(id: string | null): void;
  rollover(now?: number): void;
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
      toggle: () =>
        set((s) =>
          !s.timer.isActive && !session.canStart(s.timer)
            ? {}
            : { timer: { ...s.timer, isActive: !s.timer.isActive } },
        ),
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
    persist: { version: 1 },
    legacy: {
      keys: [LEGACY_KEY],
      read: (raw) => parseLegacyPomodoro(raw[LEGACY_KEY], Date.now()),
    },
  },
);
