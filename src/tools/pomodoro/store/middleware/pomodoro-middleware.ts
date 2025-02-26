import { createListenerMiddleware, TypedStartListening } from '@reduxjs/toolkit';
import { type RootState, type AppDispatch, updateSettings } from '../index';
import { updateTimer } from '../slices/timerSlice';
import { updateStats, resetDailyStats } from '../slices/statsSlice';
import { updateTask } from '../slices/tasksSlice';
import { TimerState } from '../../../../types/PomodoroTypes';

// Create the middleware instance
export const pomodoroMiddleware = createListenerMiddleware();

// Type-safe listener
type AppStartListening = TypedStartListening<RootState, AppDispatch>;
const startAppListening = pomodoroMiddleware.startListening as AppStartListening;

// Helper to get duration based on timer mode
const getDurationForMode = (mode: TimerState['mode'], settings: RootState['settings']): number => {
  const durations = {
    'work': settings.workDuration,
    'shortBreak': settings.shortBreakDuration,
    'longBreak': settings.longBreakDuration
  };
  return durations[mode] * 60; // Convert to seconds
};

// Helper to calculate minutes worked in a work session
const calculateMinutesWorked = (oldState: TimerState, newState: TimerState): number => {
  if (oldState.mode !== 'work' || newState.mode !== 'work') return 0;
  return Math.floor((oldState.timeLeft - newState.timeLeft) / 60);
};

// Handle timer updates and completions
startAppListening({
  actionCreator: updateTimer,
  effect: async (_, listenerApi) => {
    const oldState = (listenerApi.getOriginalState() as RootState).timer;
    const newState = (listenerApi.getState() as RootState).timer;
    const settings = (listenerApi.getState() as RootState).settings;

    // Handle timer completion
    if (oldState.timeLeft > 0 && newState.timeLeft === 0) {
      if (oldState.mode === 'work') {
        // Update stats for completed work session
        listenerApi.dispatch(updateStats({
          dailyPomodoros: (listenerApi.getState() as RootState).stats.dailyPomodoros + 1,
          weeklyPomodoros: (listenerApi.getState() as RootState).stats.weeklyPomodoros + 1,
          totalFocusTime: (listenerApi.getState() as RootState).stats.totalFocusTime + settings.workDuration,
          lastUpdate: Date.now()
        }));

        // Update task progress if one is active
        if (oldState.currentTask) {
          const tasks = (listenerApi.getState() as RootState).tasks;
          const currentTask = tasks.find(task => task.id === oldState.currentTask);
          
          if (currentTask) {
            const newCompletedPomodoros = currentTask.completedPomodoros + 1;
            listenerApi.dispatch(updateTask({
              id: currentTask.id,
              updates: {
                completedPomodoros: newCompletedPomodoros,
                completed: newCompletedPomodoros >= currentTask.pomodoros
              }
            }));
          }
        }
      }

      // Play completion sound if enabled
      if (settings.soundEnabled) {
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10...');
          await audio.play();
        } catch (error) {
          console.error('Error playing sound:', error);
        }
      }
    }

    // Update total focus time for partial work sessions
    const minutesWorked = calculateMinutesWorked(oldState, newState);
    if (minutesWorked > 0) {
      listenerApi.dispatch(updateStats({
        totalFocusTime: (listenerApi.getState() as RootState).stats.totalFocusTime + minutesWorked
      }));
    }
  }
});

// Reset daily stats and handle streak at midnight
startAppListening({
  predicate: (_, __, previousState) => {
    const now = new Date();
    const previousDate = new Date((previousState as RootState).stats.lastUpdate || Date.now());
    return now.getDate() !== previousDate.getDate() || 
           now.getMonth() !== previousDate.getMonth() ||
           now.getFullYear() !== previousDate.getFullYear();
  },
  effect: async (_, listenerApi) => {
    const state = listenerApi.getState() as RootState;
    const { dailyPomodoros, currentStreak } = state.stats;
    
    // Reset daily stats
    listenerApi.dispatch(resetDailyStats());
    
    // Update streak based on previous day's performance
    if (dailyPomodoros === 0) {
      listenerApi.dispatch(updateStats({
        currentStreak: currentStreak > 0 ? currentStreak - 1 : 0,
        lastUpdate: Date.now()
      }));
    }
  }
});

// Sync timer with settings updates
startAppListening({
  actionCreator: updateSettings,
  effect: async (_, listenerApi) => {
    const state = listenerApi.getState() as RootState;
    const { mode, isActive } = state.timer;
    
    // Only update timer if it's not currently running
    if (!isActive) {
      const newDuration = getDurationForMode(mode, state.settings);
      listenerApi.dispatch(updateTimer({ timeLeft: newDuration }));
    }
  }
});

// Handle streak updates when stats change
startAppListening({
  actionCreator: updateStats,
  effect: async (_, listenerApi) => {
    const state = listenerApi.getState() as RootState;
    const { dailyPomodoros, currentStreak, lastUpdate } = state.stats;
    
    // Only update streak for the first pomodoro of the day
    if (dailyPomodoros === 1) {
      const lastUpdateDate = new Date(lastUpdate || 0);
      const today = new Date();
      const isNewDay = today.getDate() !== lastUpdateDate.getDate() ||
                      today.getMonth() !== lastUpdateDate.getMonth() ||
                      today.getFullYear() !== lastUpdateDate.getFullYear();
      
      if (isNewDay) {
        listenerApi.dispatch(updateStats({
          currentStreak: currentStreak + 1,
          lastUpdate: Date.now()
        }));
      }
    }
  }
});