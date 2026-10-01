import { useCallback, useEffect, useRef } from 'react';
import { logToolError, toToolError } from '@/shared/lib/errors';
import completeSoundUrl from '../assets/complete.wav';
import { usePomodoroStore } from '../store';
import { formatTime } from '../lib/time';

type WorkerMessage = { type: 'TICK'; timeLeft: number } | { type: 'COMPLETE' };

/**
 * Owns the countdown worker. The store is the single place a session ends:
 * `finish()` runs once per COMPLETE (or Skip), counts once and plays the
 * sound once. The worker is (re)started whenever `isActive` or `mode`
 * changes, so an auto-started session really counts down.
 */
export function useTimerWorker(): { skip(): void } {
  const workerRef = useRef<Worker | null>(null);
  const isActive = usePomodoroStore((s) => s.timer.isActive);
  const mode = usePomodoroStore((s) => s.timer.mode);

  const finish = useCallback(() => {
    const store = usePomodoroStore.getState();
    const { soundEnabled } = store.settings;
    store.complete();
    if (!soundEnabled) return;
    try {
      // Autoplay can be blocked by the browser: not worth bothering the user.
      new Audio(completeSoundUrl)
        .play()
        .catch((e: unknown) => logToolError(toToolError(e)));
    } catch (e) {
      logToolError(toToolError(e));
    }
  }, []);

  useEffect(() => {
    const originalTitle = document.title;
    usePomodoroStore.getState().resume();
    usePomodoroStore.getState().rollover();
    if (typeof Worker === 'undefined') return;
    const worker = new Worker(
      new URL('../workers/timer.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;
      if (msg.type === 'TICK') {
        const store = usePomodoroStore.getState();
        store.tick(msg.timeLeft);
        document.title = `Pomodoro - ${store.timer.mode === 'work' ? 'Work' : 'Break'} - ${formatTime(msg.timeLeft)}`;
      } else if (msg.type === 'COMPLETE') {
        finish();
      }
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
      document.title = originalTitle;
    };
  }, [finish]);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    worker.postMessage({ type: 'STOP' });
    // Read the store, not the render: resume() on mount may have just
    // paused the timer or corrected its time.
    const timer = usePomodoroStore.getState().timer;
    if (timer.isActive) {
      worker.postMessage({
        type: 'START',
        payload: { timeLeft: timer.timeLeft },
      });
    }
  }, [isActive, mode]);

  return { skip: finish };
}
