import type {
  PomodoroState,
  Settings,
  Stats,
  Task,
  TimerMode,
  TimerState,
} from '../types';
import { isSameDay } from './time';

/**
 * Pure Pomodoro transitions. Each returns only the slices it changes, so the
 * store can `set(fn(state))`.
 */

export const DEFAULT_SETTINGS: Settings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: true,
  autoStartPomodoros: false,
  soundEnabled: true,
};

export const defaultState = (now: number): PomodoroState => ({
  timer: {
    mode: 'work',
    timeLeft: 25 * 60,
    isActive: false,
    currentTask: null,
  },
  settings: DEFAULT_SETTINGS,
  tasks: [],
  stats: {
    dailyPomodoros: 0,
    weeklyPomodoros: 0,
    totalFocusTime: 0,
    currentStreak: 0,
    lastUpdate: now,
  },
});

/** Session length in seconds. */
export const durationFor = (mode: TimerMode, s: Settings): number =>
  ({
    work: s.workDuration,
    shortBreak: s.shortBreakDuration,
    longBreak: s.longBreakDuration,
  })[mode] * 60;

/** Work needs a current task; breaks can always start. */
export const canStart = (t: TimerState): boolean =>
  !(t.mode === 'work' && !t.currentTask);

export const nextIncompleteTaskId = (tasks: Task[]): string | null =>
  tasks.find((t) => !t.completed)?.id ?? null;

/**
 * On the first call of a new day: reset the daily count, drop the streak by
 * one if yesterday had no pomodoros, and stamp `lastUpdate` so it runs once.
 */
export function rolloverDay(stats: Stats, now: number): Stats {
  if (isSameDay(stats.lastUpdate, now)) return stats;
  return {
    ...stats,
    dailyPomodoros: 0,
    currentStreak:
      stats.dailyPomodoros === 0
        ? Math.max(0, stats.currentStreak - 1)
        : stats.currentStreak,
    lastUpdate: now,
  };
}

/**
 * The end of a session (timer reached zero or Skip). Work counts one
 * pomodoro and one task step, then moves to a short break; a break only moves
 * back to work.
 */
export function completeSession(
  s: PomodoroState,
  now: number,
): Pick<PomodoroState, 'timer' | 'stats' | 'tasks'> {
  const day = rolloverDay(s.stats, now);
  if (s.timer.mode !== 'work') {
    return {
      stats: day,
      tasks: s.tasks,
      timer: {
        ...s.timer,
        mode: 'work',
        timeLeft: durationFor('work', s.settings),
        isActive: s.settings.autoStartPomodoros,
      },
    };
  }
  const stats: Stats = {
    ...day,
    dailyPomodoros: day.dailyPomodoros + 1,
    weeklyPomodoros: day.weeklyPomodoros + 1,
    totalFocusTime: day.totalFocusTime + s.settings.workDuration,
    currentStreak:
      day.dailyPomodoros === 0 ? day.currentStreak + 1 : day.currentStreak,
    lastUpdate: now,
  };
  let tasks = s.tasks;
  let currentTask = s.timer.currentTask;
  const current = tasks.find((t) => t.id === currentTask);
  if (current) {
    const done = current.completedPomodoros + 1;
    const completed = done >= current.pomodoros;
    tasks = tasks.map((t) =>
      t.id === current.id ? { ...t, completedPomodoros: done, completed } : t,
    );
    if (completed) currentTask = nextIncompleteTaskId(tasks);
  }
  return {
    stats,
    tasks,
    timer: {
      ...s.timer,
      currentTask,
      mode: 'shortBreak',
      timeLeft: durationFor('shortBreak', s.settings),
      isActive: s.settings.autoStartBreaks,
    },
  };
}

/** A paused timer picks up the new duration; a running one keeps going. */
export function applySettings(
  s: PomodoroState,
  patch: Partial<Settings>,
): Pick<PomodoroState, 'settings' | 'timer'> {
  const settings = { ...s.settings, ...patch };
  return {
    settings,
    timer: s.timer.isActive
      ? s.timer
      : { ...s.timer, timeLeft: durationFor(s.timer.mode, settings) },
  };
}

export const selectMode = (
  s: PomodoroState,
  mode: TimerMode,
): Pick<PomodoroState, 'timer'> => ({
  timer: {
    ...s.timer,
    mode,
    timeLeft: durationFor(mode, s.settings),
    isActive: false,
  },
});

export const resetTimer = (s: PomodoroState): Pick<PomodoroState, 'timer'> => ({
  timer: {
    ...s.timer,
    timeLeft: durationFor(s.timer.mode, s.settings),
    isActive: false,
  },
});

export const addTask = (
  s: PomodoroState,
  title: string,
  id: string,
): Pick<PomodoroState, 'tasks'> => ({
  tasks: [
    ...s.tasks,
    { id, title, completed: false, pomodoros: 1, completedPomodoros: 0 },
  ],
});

export function toggleTask(
  s: PomodoroState,
  id: string,
): Pick<PomodoroState, 'tasks' | 'timer'> {
  const tasks = s.tasks.map((t) =>
    t.id === id ? { ...t, completed: !t.completed } : t,
  );
  const nowCompleted = tasks.find((t) => t.id === id)?.completed;
  const timer =
    nowCompleted && s.timer.currentTask === id
      ? { ...s.timer, currentTask: nextIncompleteTaskId(tasks) }
      : s.timer;
  return { tasks, timer };
}

export function deleteTask(
  s: PomodoroState,
  id: string,
): Pick<PomodoroState, 'tasks' | 'timer'> {
  const tasks = s.tasks.filter((t) => t.id !== id);
  const timer =
    s.timer.currentTask === id
      ? { ...s.timer, currentTask: nextIncompleteTaskId(tasks) }
      : s.timer;
  return { tasks, timer };
}
