import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import timerSlice from './slices/timerSlice';
import settingsSlice  from './slices/settingsSlice';
import tasksSlice from './slices/tasksSlice';
import statsSlice from './slices/statsSlice';
import { pomodoroMiddleware } from './middleware/pomodoro-middleware';
import { taskMiddleware } from './middleware/task-middleware';

const persistConfig = {
  key: 'pomodoro-store',
  storage,
};

const rootReducer = combineReducers({
  timer: timerSlice.reducer,
  settings: settingsSlice.reducer,
  tasks: tasksSlice.reducer,
  stats: statsSlice.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).prepend(pomodoroMiddleware.middleware, taskMiddleware.middleware),
});

export const persistor = persistStore(store);

// Export actions
export * from './slices/timerSlice';
export * from './slices/settingsSlice';
export * from './slices/tasksSlice';
export * from './slices/statsSlice';
// Type exports
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;