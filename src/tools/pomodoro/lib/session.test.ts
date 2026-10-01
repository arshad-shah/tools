import { describe, expect, it } from 'vitest';
import {
  addTask,
  applySettings,
  canStart,
  completeSession,
  defaultState,
  deleteTask,
  durationFor,
  nextIncompleteTaskId,
  resetTimer,
  rolloverDay,
  selectMode,
  toggleTask,
} from './session';
import type { PomodoroState, Task } from '../types';

const DAY1 = new Date(2026, 9, 1, 10).getTime();
const DAY1_LATER = new Date(2026, 9, 1, 18).getTime();
const DAY2 = new Date(2026, 9, 2, 9).getTime();
const DAY3 = new Date(2026, 9, 3, 9).getTime();

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: id,
  completed: false,
  pomodoros: 2,
  completedPomodoros: 0,
  ...over,
});
const state = (over: Partial<PomodoroState> = {}): PomodoroState => ({
  ...defaultState(DAY1),
  ...over,
});

describe('durations and guards', () => {
  it('derives seconds from settings', () => {
    const s = state();
    expect(durationFor('work', s.settings)).toBe(25 * 60);
    expect(durationFor('shortBreak', s.settings)).toBe(5 * 60);
    expect(durationFor('longBreak', s.settings)).toBe(15 * 60);
  });
  it('needs a current task to start work, not a break', () => {
    const s = state();
    expect(canStart(s.timer)).toBe(false);
    expect(canStart({ ...s.timer, currentTask: 't' })).toBe(true);
    expect(canStart({ ...s.timer, mode: 'shortBreak' })).toBe(true);
  });
  it('finds the next incomplete task', () => {
    expect(nextIncompleteTaskId([])).toBeNull();
    expect(
      nextIncompleteTaskId([task('a', { completed: true }), task('b')]),
    ).toBe('b');
  });
});

describe('completeSession', () => {
  it('work → short break: +1 daily/weekly, focus += workDuration, task +1, streak +1 on first of day', () => {
    const s = state({
      tasks: [task('a')],
      timer: { mode: 'work', timeLeft: 0, isActive: true, currentTask: 'a' },
    });
    const r = completeSession(s, DAY1_LATER);
    expect(r.stats).toMatchObject({
      dailyPomodoros: 1,
      weeklyPomodoros: 1,
      totalFocusTime: 25,
      currentStreak: 1,
      lastUpdate: DAY1_LATER,
    });
    expect(r.tasks[0]).toMatchObject({
      completedPomodoros: 1,
      completed: false,
    });
    expect(r.timer).toEqual({
      mode: 'shortBreak',
      timeLeft: 300,
      isActive: true, // autoStartBreaks default true
      currentTask: 'a',
    });
  });
  it('builds a streak of one per productive day (B5: the old listener never incremented)', () => {
    // The old listener compared "today" with a lastUpdate the same action had
    // just set to now, so the streak stayed at 0.
    let s = state();
    for (const day of [DAY1, DAY2, DAY3]) {
      s = {
        ...s,
        ...completeSession(
          { ...s, timer: { ...s.timer, mode: 'work', timeLeft: 0 } },
          day,
        ),
      };
    }
    expect(s.stats.currentStreak).toBe(3);
  });
  it('second work session the same day does not bump the streak again', () => {
    const s = state({
      stats: {
        dailyPomodoros: 1,
        weeklyPomodoros: 1,
        totalFocusTime: 25,
        currentStreak: 1,
        lastUpdate: DAY1,
      },
      timer: { mode: 'work', timeLeft: 0, isActive: true, currentTask: null },
    });
    expect(completeSession(s, DAY1_LATER).stats.currentStreak).toBe(1);
  });
  it('one completion counts exactly one pomodoro and one task step (B5)', () => {
    const s = state({
      tasks: [task('a', { pomodoros: 5 })],
      timer: { mode: 'work', timeLeft: 0, isActive: true, currentTask: 'a' },
    });
    const r = completeSession(s, DAY1);
    expect(r.stats.dailyPomodoros).toBe(1);
    expect(r.stats.weeklyPomodoros).toBe(1);
    expect(r.stats.totalFocusTime).toBe(25);
    expect(r.tasks[0].completedPomodoros).toBe(1);
  });
  it('finishing the last pomodoro completes the task and moves to the next incomplete one', () => {
    const s = state({
      tasks: [
        task('a', { completedPomodoros: 1 }),
        task('b', { completed: true }),
        task('c'),
      ],
      timer: { mode: 'work', timeLeft: 0, isActive: true, currentTask: 'a' },
    });
    const r = completeSession(s, DAY1);
    expect(r.tasks[0]).toMatchObject({
      completed: true,
      completedPomodoros: 2,
    });
    expect(r.timer.currentTask).toBe('c');
  });
  it('break → work does NOT touch tasks or stats (B5)', () => {
    const s = state({
      tasks: [task('a')],
      timer: {
        mode: 'shortBreak',
        timeLeft: 0,
        isActive: true,
        currentTask: 'a',
      },
    });
    const r = completeSession(s, DAY1);
    expect(r.tasks).toBe(s.tasks);
    expect(r.stats.dailyPomodoros).toBe(0);
    expect(r.timer).toEqual({
      mode: 'work',
      timeLeft: 1500,
      isActive: false, // autoStartPomodoros default false
      currentTask: 'a',
    });
  });
  it('long break → work, auto-started when autoStartPomodoros is on', () => {
    const s = state({
      settings: { ...defaultState(DAY1).settings, autoStartPomodoros: true },
      timer: {
        mode: 'longBreak',
        timeLeft: 0,
        isActive: true,
        currentTask: null,
      },
    });
    expect(completeSession(s, DAY1).timer).toMatchObject({
      mode: 'work',
      timeLeft: 1500,
      isActive: true,
    });
  });
  it('rolls the day over before counting', () => {
    const s = state({
      stats: {
        dailyPomodoros: 3,
        weeklyPomodoros: 3,
        totalFocusTime: 75,
        currentStreak: 2,
        lastUpdate: DAY1,
      },
      timer: { mode: 'work', timeLeft: 0, isActive: true, currentTask: null },
    });
    expect(completeSession(s, DAY2).stats).toMatchObject({
      dailyPomodoros: 1,
      weeklyPomodoros: 4,
      currentStreak: 3,
    });
  });
});

describe('rolloverDay', () => {
  const base = {
    dailyPomodoros: 0,
    weeklyPomodoros: 5,
    totalFocusTime: 100,
    currentStreak: 3,
    lastUpdate: DAY1,
  };
  it('is a no-op on the same day', () => {
    expect(rolloverDay(base, DAY1_LATER)).toBe(base);
  });
  it('after a zero day: reset daily, streak −1, lastUpdate = now', () => {
    expect(rolloverDay(base, DAY2)).toEqual({
      ...base,
      currentStreak: 2,
      lastUpdate: DAY2,
    });
  });
  it('after a productive day: reset daily, keep streak, and fire only once', () => {
    const r = rolloverDay({ ...base, dailyPomodoros: 4 }, DAY2);
    expect(r).toEqual({ ...base, dailyPomodoros: 0, lastUpdate: DAY2 });
    // The old listener left lastUpdate alone here and re-fired on every action.
    expect(rolloverDay(r, DAY2 + 1000)).toBe(r);
  });
  it('counts skipped days as zero days: productive day then a 3-day gap drops the streak by 2', () => {
    // Thu 1 Oct productive; back Sun 4 Oct: Fri and Sat were zero days.
    const r = rolloverDay(
      { ...base, dailyPomodoros: 4, currentStreak: 5 },
      new Date(2026, 9, 4, 9).getTime(),
    );
    expect(r.currentStreak).toBe(3);
    expect(r.dailyPomodoros).toBe(0);
  });
  it('counts a zero last day plus the skipped days, across a month boundary', () => {
    // Tue 29 Sep had nothing; back Fri 2 Oct: 29 Sep, 30 Sep and 1 Oct missed.
    const r = rolloverDay(
      {
        ...base,
        currentStreak: 5,
        lastUpdate: new Date(2026, 8, 29, 20).getTime(),
      },
      new Date(2026, 9, 2, 8).getTime(),
    );
    expect(r.currentStreak).toBe(2);
  });
  it('a long absence ends the streak', () => {
    const r = rolloverDay(
      { ...base, dailyPomodoros: 2, currentStreak: 4 },
      new Date(2026, 10, 1, 9).getTime(),
    );
    expect(r.currentStreak).toBe(0);
  });
  it('resets the weekly count when a new (Monday-based) week starts', () => {
    // Thu 1 Oct → Sun 4 Oct is the same week; Mon 5 Oct is a new one.
    expect(
      rolloverDay(base, new Date(2026, 9, 4, 9).getTime()).weeklyPomodoros,
    ).toBe(5);
    expect(
      rolloverDay(base, new Date(2026, 9, 5, 9).getTime()).weeklyPomodoros,
    ).toBe(0);
  });
  it('treats a clock that went backwards like a single day change', () => {
    const r = rolloverDay(
      { ...base, dailyPomodoros: 1 },
      new Date(2026, 8, 30, 9).getTime(),
    );
    expect(r.currentStreak).toBe(3);
    expect(r.dailyPomodoros).toBe(0);
  });
  it('never goes below zero', () => {
    expect(rolloverDay({ ...base, currentStreak: 0 }, DAY2).currentStreak).toBe(
      0,
    );
  });
});

describe('settings, mode, reset', () => {
  it('settings change while paused resets timeLeft for the current mode', () => {
    const r = applySettings(state(), { workDuration: 30 });
    expect(r.settings.workDuration).toBe(30);
    expect(r.timer.timeLeft).toBe(1800);
  });
  it('settings change while running keeps timeLeft', () => {
    const s = state({
      timer: { mode: 'work', timeLeft: 42, isActive: true, currentTask: 't' },
    });
    expect(applySettings(s, { workDuration: 30 }).timer.timeLeft).toBe(42);
  });
  it('selecting a mode pauses and loads its duration', () => {
    const s = state({
      timer: { mode: 'work', timeLeft: 42, isActive: true, currentTask: 't' },
    });
    expect(selectMode(s, 'longBreak').timer).toEqual({
      mode: 'longBreak',
      timeLeft: 900,
      isActive: false,
      currentTask: 't',
    });
  });
  it('reset restores the current mode duration and pauses', () => {
    const s = state({
      timer: {
        mode: 'shortBreak',
        timeLeft: 7,
        isActive: true,
        currentTask: null,
      },
    });
    expect(resetTimer(s).timer).toMatchObject({
      timeLeft: 300,
      isActive: false,
      mode: 'shortBreak',
    });
  });
});

describe('tasks', () => {
  it('adds a task with defaults', () => {
    expect(addTask(state(), 'Write', 'id1').tasks).toEqual([
      {
        id: 'id1',
        title: 'Write',
        completed: false,
        pomodoros: 1,
        completedPomodoros: 0,
      },
    ]);
  });
  it('completing the current task moves currentTask to the next incomplete', () => {
    const s = state({
      tasks: [task('a'), task('b')],
      timer: {
        mode: 'work',
        timeLeft: 1500,
        isActive: false,
        currentTask: 'a',
      },
    });
    const r = toggleTask(s, 'a');
    expect(r.tasks[0].completed).toBe(true);
    expect(r.timer.currentTask).toBe('b');
  });
  it('un-completing a task leaves currentTask alone', () => {
    const s = state({
      tasks: [task('a', { completed: true }), task('b')],
      timer: {
        mode: 'work',
        timeLeft: 1500,
        isActive: false,
        currentTask: 'b',
      },
    });
    expect(toggleTask(s, 'a').timer.currentTask).toBe('b');
  });
  it('deleting the current task moves to the next incomplete (or null)', () => {
    const s = state({
      tasks: [task('a')],
      timer: {
        mode: 'work',
        timeLeft: 1500,
        isActive: false,
        currentTask: 'a',
      },
    });
    const r = deleteTask(s, 'a');
    expect(r.tasks).toEqual([]);
    expect(r.timer.currentTask).toBeNull();
  });
  it('deleting another task leaves currentTask alone', () => {
    const s = state({
      tasks: [task('a'), task('b')],
      timer: {
        mode: 'work',
        timeLeft: 1500,
        isActive: false,
        currentTask: 'a',
      },
    });
    expect(deleteTask(s, 'b').timer.currentTask).toBe('a');
  });
});
