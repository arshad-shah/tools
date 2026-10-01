import type { Stats } from '../types';

export const DAILY_GOAL = 8;

/** Percent of the daily goal reached (can exceed 100). */
export const progressToGoal = (stats: Stats): number =>
  (stats.dailyPomodoros / DAILY_GOAL) * 100;

/** Weekly pomodoros spread over the streak (at most 7 days). */
export const averageDaily = (stats: Stats): string =>
  stats.currentStreak > 0
    ? (stats.weeklyPomodoros / Math.min(stats.currentStreak, 7)).toFixed(1)
    : '0';

export function focusScore(stats: Stats): number {
  const dailyProgress = (stats.dailyPomodoros / DAILY_GOAL) * 100;
  const streakBonus = Math.min(stats.currentStreak * 5, 25);
  const weeklyBonus = Math.min(stats.weeklyPomodoros, 50);
  return Math.min(Math.floor(dailyProgress + streakBonus + weeklyBonus), 100);
}

export function timePeriod(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
