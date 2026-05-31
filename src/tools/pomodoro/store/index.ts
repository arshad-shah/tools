import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import type { WebStorage } from 'redux-persist/lib/types';

import timerSlice from './slices/timerSlice';
import settingsSlice from './slices/settingsSlice';
import tasksSlice from './slices/tasksSlice';
import statsSlice from './slices/statsSlice';
import { pomodoroMiddleware } from './middleware/pomodoro-middleware';
import { taskMiddleware } from './middleware/task-middleware';

/**
 * Interop-safe localStorage adapter for redux-persist.
 *
 * We intentionally avoid `import storage from 'redux-persist/lib/storage'`:
 * redux-persist is a CommonJS package, and Vite's bundler (rolldown) mis-resolves
 * that default import so the resulting `storage` object lacks a working `getItem`.
 * That crashes `persistStore()` at module-eval time ("storage.getItem is not a
 * function"), which makes the whole lazily-imported Pomodoro chunk fail to load.
 * Defining the adapter inline sidesteps the broken CJS interop entirely and is
 * also SSR/private-mode safe.
 */
const createNoopStorage = (): WebStorage => ({
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
});

const createWebStorage = (): WebStorage => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const ls = window.localStorage;
      // Probe to confirm storage is writable (it can throw in private mode).
      const probe = '__pomodoro_persist_probe__';
      ls.setItem(probe, probe);
      ls.removeItem(probe);
      return {
        getItem: (key) => Promise.resolve(ls.getItem(key)),
        setItem: (key, value) => Promise.resolve(ls.setItem(key, value)),
        removeItem: (key) => Promise.resolve(ls.removeItem(key)),
      };
    }
  } catch {
    // Fall through to the noop adapter below.
  }
  return createNoopStorage();
};

const storage = createWebStorage();

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
