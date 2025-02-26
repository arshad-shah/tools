
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TimerState } from '../../../../types/PomodoroTypes';

const initialState: TimerState = {
  mode: 'work',
  timeLeft: 25 * 60,
  isActive: false,
  currentTask: null,
};
const timerSlice = createSlice({
  name: 'timer',
  initialState,
  reducers: {
    updateTimer: (state, action: PayloadAction<Partial<TimerState>>) => {
      // Properly mutate state using Immer
      Object.assign(state, action.payload);
    },
    resetTimer: (state, action: PayloadAction<number>) => {
      state.timeLeft = action.payload * 60;
      state.isActive = false;
      state.mode = 'work';
    },
    toggleTimer: (state) => {
      state.isActive = !state.isActive;
    },
    setCurrentTask: (state, action: PayloadAction<string | null>) => {
      state.currentTask = action.payload;
    },
  },
})

export const { updateTimer, resetTimer, toggleTimer, setCurrentTask } = timerSlice.actions;
export default timerSlice;