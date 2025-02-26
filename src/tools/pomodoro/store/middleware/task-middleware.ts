import { createListenerMiddleware, TypedStartListening } from '@reduxjs/toolkit';
import { type RootState, type AppDispatch } from '../index';
import { updateTimer, setCurrentTask } from '../slices/timerSlice';
import { updateTask, deleteTask } from '../slices/tasksSlice';
import { Task } from '../../../../types/PomodoroTypes';

// Create the middleware instance
export const taskMiddleware = createListenerMiddleware();

// Type-safe listener
type AppStartListening = TypedStartListening<RootState, AppDispatch>;
const startAppListening = taskMiddleware.startListening as AppStartListening;

// Helper to find the next incomplete task
const findNextTask = (tasks: Task[]): Task | undefined => {
  return tasks.find(task => !task.completed);
};

// Handle task completion
startAppListening({
  actionCreator: updateTask,
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState() as RootState;
    const { id, updates } = action.payload;
    
    // If a task was completed, check if we need to update the current task
    if (updates.completed && id === state.timer.currentTask) {
      const nextTask = findNextTask(state.tasks);
      listenerApi.dispatch(setCurrentTask(nextTask?.id || null));
    }
  }
});

// Handle task deletion
startAppListening({
  actionCreator: deleteTask,
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState() as RootState;
    const deletedTaskId = action.payload;
    
    // If the deleted task was the current task, find a new one
    if (deletedTaskId === state.timer.currentTask) {
      const nextTask = findNextTask(state.tasks);
      listenerApi.dispatch(setCurrentTask(nextTask?.id || null));
    }
  }
});

// Update current task on timer completion
startAppListening({
  actionCreator: updateTimer,
  effect: async (_, listenerApi) => {
    const oldState = listenerApi.getOriginalState() as RootState;
    const newState = listenerApi.getState() as RootState;
    
    // Check if timer just completed
    if (oldState.timer.timeLeft > 0 && newState.timer.timeLeft === 0) {
      // Only proceed if we were in work mode and finishing a full pomodoro
      if (oldState.timer.mode === 'work' && oldState.timer.currentTask && 
          oldState.timer.timeLeft === oldState.settings.workDuration * 60) {
        const tasks = newState.tasks;
        const currentTask = tasks.find(task => task.id === oldState.timer.currentTask);
        
        if (currentTask) {
          // Update completed pomodoros
          const newCompletedPomodoros = currentTask.completedPomodoros + 1;
          const isTaskComplete = newCompletedPomodoros >= currentTask.pomodoros;
          
          // Update the task
          listenerApi.dispatch(updateTask({
            id: currentTask.id,
            updates: {
              completedPomodoros: newCompletedPomodoros,
              completed: isTaskComplete
            }
          }));
          
          // If task is complete, move to next task
          if (isTaskComplete) {
            const nextTask = findNextTask(tasks.filter(t => t.id !== currentTask.id));
            listenerApi.dispatch(setCurrentTask(nextTask?.id || null));
          }
        }
      }
    }
  }
});