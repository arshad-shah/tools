import { describe, expect, it } from 'vitest';
import type { Stats } from '../types';
import { averageDaily, focusScore, progressToGoal, timePeriod } from './stats';

const s = (o: Partial<Stats> = {}): Stats => ({
  dailyPomodoros: 4,
  weeklyPomodoros: 20,
  totalFocusTime: 100,
  currentStreak: 2,
  lastUpdate: 0,
  ...o,
});

describe('pomodoro stats', () => {
  it('focus score = daily% + streak bonus (≤25) + weekly bonus (≤50), capped at 100', () => {
    expect(focusScore(s())).toBe(Math.min(Math.floor(50 + 10 + 20), 100));
    expect(
      focusScore(
        s({ dailyPomodoros: 8, currentStreak: 9, weeklyPomodoros: 80 }),
      ),
    ).toBe(100);
  });
  it('average daily over min(streak, 7) days, "0" without a streak', () => {
    expect(averageDaily(s())).toBe('10.0');
    expect(averageDaily(s({ currentStreak: 0 }))).toBe('0');
    expect(averageDaily(s({ currentStreak: 10, weeklyPomodoros: 14 }))).toBe(
      '2.0',
    );
  });
  it('progress to the daily goal of 8', () => {
    expect(progressToGoal(s())).toBe(50);
  });
  it('time period by hour', () => {
    expect(timePeriod(9)).toBe('morning');
    expect(timePeriod(13)).toBe('afternoon');
    expect(timePeriod(17)).toBe('evening');
    expect(timePeriod(20)).toBe('evening');
  });
});
