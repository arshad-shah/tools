import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Task } from '../../../../types/PomodoroTypes';

const initialState: Task[] = [];

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    addTask: {
      prepare: (task: Omit<Task, 'id'>) => ({
        payload: {
          ...task,
          id: crypto.randomUUID(),
          completed: false,
          completedPomodoros: 0,
        },
      }),
      reducer: (state, action: PayloadAction<Task>) => {
        state.push(action.payload);
      },
    },
    updateTask: (state, action: PayloadAction<{ id: string; updates: Partial<Task> }>) => {
      const { id, updates } = action.payload;
      const task = state.find((task: Task) => task.id === id);
      if (task) {
        Object.assign(task, updates);
      }
    },
    deleteTask: (state, action: PayloadAction<string>) => {
      return state.filter((task: Task) => task.id !== action.payload);
    },
  },
});


export const { addTask, updateTask, deleteTask } = tasksSlice.actions;
export default tasksSlice;
