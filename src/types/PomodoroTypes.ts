// Types
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
}

export interface Stats {
  dailyPomodoros: number;
  weeklyPomodoros: number;
  totalFocusTime: number;
  currentStreak: number;
  lastUpdate: number;
}

// Store interface
export interface Store {
  // States
  timer: TimerState;
  settings: Settings;
  tasks: Task[];
  stats: Stats;

  // Timer actions
  updateTimer: (updates: Partial<TimerState>) => void;
  resetTimer: () => void;
  toggleTimer: () => void;
  
  // Settings actions
  updateSettings: (updates: Partial<Settings>) => void;
  
  // Task actions
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setCurrentTask: (taskId: string | null) => void;
  
  // Stats actions
  updateStats: (updates: Partial<Stats>) => void;
  incrementPomodoro: () => void;
  resetDailyStats: () => void;
}