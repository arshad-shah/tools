import type {
  PomodoroState,
  Settings,
  Stats,
  Task,
  TimerMode,
  TimerState,
} from '../types';
import { localDate, recordSession } from './history';
import { daysBetween, isSameDay, isSameWeek } from './time';

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
  longBreakEvery: 4,
  notifications: false,
  sound: 'chime',
  volume: 80,
  faviconRing: false,
};

export const defaultState = (now: number): PomodoroState => ({
  timer: {
    mode: 'work',
    timeLeft: 25 * 60,
    isActive: false,
    currentTask: null,
    completedWork: 0,
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
  history: [],
});

/** Session length in seconds. */
export const durationFor = (mode: TimerMode, s: Settings): number =>
  ({
    work: s.workDuration,
    shortBreak: s.shortBreakDuration,
    longBreak: s.longBreakDuration,
  })[mode] * 60;

export type SessionKind = 'work' | 'short' | 'long';

const every = (s: Settings) =>
  Math.max(1, Math.round(s.longBreakEvery || DEFAULT_SETTINGS.longBreakEvery));

/**
 * The session after the current one ends: a break goes back to work; work
 * goes to a long break when the completed work count (this one included,
 * as stored after completing) is a multiple of `longBreakEvery`.
 */
export function nextSession(s: PomodoroState): SessionKind {
  if (s.timer.mode !== 'work') return 'work';
  const done = s.timer.completedWork ?? 0;
  return done > 0 && done % every(s.settings) === 0 ? 'long' : 'short';
}

/** How far through the current long-break cycle (0 to longBreakEvery - 1). */
export const cyclePosition = (completedWork: number, settings: Settings) =>
  completedWork % every(settings);

export const nextIncompleteTaskId = (tasks: Task[]): string | null =>
  tasks.find((t) => !t.completed)?.id ?? null;

/**
 * On the first call of a new day: reset the daily count, take one off the
 * streak for every zero day since `lastUpdate` (the last active day if it had
 * no pomodoros, plus every day skipped entirely), reset the weekly count in a
 * new Monday-based week, and stamp `lastUpdate` so it runs once.
 */
export function rolloverDay(stats: Stats, now: number): Stats {
  if (isSameDay(stats.lastUpdate, now)) return stats;
  // A clock that went backwards counts as a single day change.
  const days = Math.max(1, daysBetween(stats.lastUpdate, now));
  const missed = days - 1 + (stats.dailyPomodoros === 0 ? 1 : 0);
  return {
    ...stats,
    dailyPomodoros: 0,
    weeklyPomodoros: isSameWeek(stats.lastUpdate, now)
      ? stats.weeklyPomodoros
      : 0,
    currentStreak: Math.max(0, stats.currentStreak - missed),
    lastUpdate: now,
  };
}

/**
 * Sets the run state. A running timer carries its wall-clock end, so a
 * reload can tell how much time is really left; a paused one has none.
 */
const run = (t: TimerState, active: boolean, now: number): TimerState => ({
  ...t,
  isActive: active,
  endsAt: active ? now + t.timeLeft * 1000 : undefined,
});

/** Start or pause. A task is optional: without one it is "Just focus". */
export function toggleTimer(
  s: PomodoroState,
  now: number,
): Pick<PomodoroState, 'timer'> {
  return { timer: run(s.timer, !s.timer.isActive, now) };
}

/**
 * The end of a session. When the timer reaches zero, work counts one
 * pomodoro and one task step, then moves to a short break, or a long one
 * every `longBreakEvery` sessions; a break moves back to work. A skipped
 * session (`skipped: true`) counts nothing: no stats, no task step, no
 * cycle step, and work goes on to a short break.
 */
export function completeSession(
  s: PomodoroState,
  now: number,
  { skipped = false }: { skipped?: boolean } = {},
): Pick<PomodoroState, 'timer' | 'stats' | 'tasks' | 'history'> {
  const day = rolloverDay(s.stats, now);
  const history = s.history ?? [];
  const logged = skipped
    ? history
    : recordSession(history, {
        date: localDate(now),
        kind: s.timer.mode === 'work' ? 'work' : 'break',
        minutes: durationFor(s.timer.mode, s.settings) / 60,
      });
  if (skipped && s.timer.mode === 'work') {
    return {
      history: logged,
      stats: day,
      tasks: s.tasks,
      timer: run(
        {
          ...s.timer,
          mode: 'shortBreak',
          timeLeft: durationFor('shortBreak', s.settings),
        },
        s.settings.autoStartBreaks,
        now,
      ),
    };
  }
  if (s.timer.mode !== 'work') {
    return {
      history: logged,
      stats: day,
      tasks: s.tasks,
      timer: run(
        { ...s.timer, mode: 'work', timeLeft: durationFor('work', s.settings) },
        s.settings.autoStartPomodoros,
        now,
      ),
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
  const completedWork = (s.timer.completedWork ?? 0) + 1;
  const mode: TimerMode =
    nextSession({ ...s, timer: { ...s.timer, completedWork } }) === 'long'
      ? 'longBreak'
      : 'shortBreak';
  return {
    history: logged,
    stats,
    tasks,
    timer: run(
      {
        ...s.timer,
        currentTask,
        completedWork,
        mode,
        timeLeft: durationFor(mode, s.settings),
      },
      s.settings.autoStartBreaks,
      now,
    ),
  };
}

/**
 * After a reload. A paused timer is left alone. A running one gets the time
 * really left from its wall-clock end; if that passed while the tab was
 * closed, the session is completed as of its end (so it counts on its own
 * day), silently, and the next one waits paused. A running timer without an
 * end time (older data) comes back paused.
 */
export function resumeTimer(
  s: PomodoroState,
  now: number,
): Partial<Pick<PomodoroState, 'timer' | 'stats' | 'tasks' | 'history'>> {
  const { timer } = s;
  if (!timer.isActive) return {};
  if (timer.endsAt == null) return { timer: run(timer, false, now) };
  const left = Math.ceil((timer.endsAt - now) / 1000);
  if (left > 0) return { timer: { ...timer, timeLeft: left } };
  const done = completeSession(s, timer.endsAt);
  return {
    ...done,
    stats: rolloverDay(done.stats, now),
    timer: run(done.timer, false, now),
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
    endsAt: undefined,
  },
});

export const resetTimer = (s: PomodoroState): Pick<PomodoroState, 'timer'> => ({
  timer: {
    ...s.timer,
    timeLeft: durationFor(s.timer.mode, s.settings),
    isActive: false,
    endsAt: undefined,
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
