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
}

export interface TimerState {
  mode: 'work' | 'shortBreak' | 'longBreak';
  timeLeft: number;
  isActive: boolean;
  currentTask: string | null;
  /** Wall-clock end (ms) while running; absent when paused. */
  endsAt?: number;
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
}
