import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Stats } from '../../../../types/PomodoroTypes';

const initialState: Stats = {
  dailyPomodoros: 0,
  weeklyPomodoros: 0,
  totalFocusTime: 0,
  currentStreak: 0,
  lastUpdate: Date.now(),
};

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    updateStats: (state, action: PayloadAction<Partial<Stats>>) => {
      return { ...state, ...action.payload };
    },
    incrementPomodoro: (state, action: PayloadAction<number>) => {
      state.dailyPomodoros += 1;
      state.weeklyPomodoros += 1;
      state.totalFocusTime += action.payload;
    },
    resetDailyStats: (state) => {
      state.dailyPomodoros = 0;
    },
  },
});

export const { updateStats, incrementPomodoro, resetDailyStats } = statsSlice.actions;
export default statsSlice;