import type { DayLog } from './lib/history';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  pomodoros: number;
  completedPomodoros: number;
}

export interface Settings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
  /** A long break follows every Nth completed work session (default 4). */
  longBreakEvery: number;
  /** Opt-in system notification when a session ends in a hidden tab. */
  notifications: boolean;
  sound: SoundId;
  /** 0 to 100. */
  volume: number;
  /** Draw the session progress as the tab icon. */
  faviconRing: boolean;
}

export type SoundId = 'chime' | 'bell' | 'wood';

export interface TimerState {
  mode: 'work' | 'shortBreak' | 'longBreak';
  timeLeft: number;
  isActive: boolean;
  currentTask: string | null;
  /** Wall-clock end (ms) while running; absent when paused. */
  endsAt?: number;
  /** Work sessions completed (not skipped); drives the long-break cycle. */
  completedWork?: number;
}

export interface Stats {
  dailyPomodoros: number;
  weeklyPomodoros: number;
  totalFocusTime: number;
  currentStreak: number;
  lastUpdate: number;
}

export type TimerMode = TimerState['mode'];

export interface PomodoroState {
  timer: TimerState;
  settings: Settings;
  tasks: Task[];
  stats: Stats;
  /** Per-day session counts (no task text), newest 365 days. */
  history: DayLog[];
}
