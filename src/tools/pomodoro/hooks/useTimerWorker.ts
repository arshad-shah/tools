import { useCallback, useEffect, useRef, useState } from 'react';
import { logToolError, toToolError } from '@/shared/lib/errors';
import bellSoundUrl from '../assets/bell.wav';
import chimeSoundUrl from '../assets/complete.wav';
import woodSoundUrl from '../assets/wood.wav';
import { usePomodoroStore } from '../store';
import { MODE_INFO } from '../lib/modes';
import { notifySessionEnd } from '../lib/notify';
import type { SoundId } from '../types';
import { formatTime } from '../lib/time';

/** Same-origin bundled sounds (in-house; see src/app/licences.ts). */
export const SOUND_URLS: Record<SoundId, string> = {
  chime: chimeSoundUrl,
  bell: bellSoundUrl,
  wood: woodSoundUrl,
};

type WorkerMessage = { type: 'TICK'; timeLeft: number } | { type: 'COMPLETE' };

const reportSoundError = (e: unknown) =>
  logToolError(toToolError(e, 'Could not play the completion sound'));

export interface TimerWorker {
  /** End the current session now without counting it (no chime). */
  skip(): void;
  /**
   * Call from a click (Start, Skip): creates and loads the one sound element,
   * so the first chime does not wait for the download and browsers that
   * need a gesture (iOS Safari) allow it to play later.
   */
  prime(): void;
  /** Polite screen-reader message for the last session change. */
  announcement: string;
}

/**
 * Owns the countdown worker. The store is the single place a session ends:
 * `finish()` runs once per COMPLETE, counts once and plays the sound once;
 * `skip()` moves on without counting or a sound. The worker is (re)started whenever `isActive` or `mode`
 * changes, so an auto-started session really counts down.
 */
export function useTimerWorker(): TimerWorker {
  const workerRef = useRef<Worker | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const isActive = usePomodoroStore((s) => s.timer.isActive);
  const mode = usePomodoroStore((s) => s.timer.mode);

  const soundRef = useRef<SoundId | null>(null);

  const prime = useCallback(() => {
    const sound = usePomodoroStore.getState().settings.sound ?? 'chime';
    if (audioRef.current && soundRef.current === sound) return;
    try {
      const audio = new Audio(SOUND_URLS[sound] ?? chimeSoundUrl);
      soundRef.current = sound;
      audio.preload = 'auto';
      audio.load();
      audioRef.current = audio;
    } catch (e) {
      reportSoundError(e);
    }
  }, []);

  const end = useCallback((skipped: boolean) => {
    const store = usePomodoroStore.getState();
    const ended = store.timer.mode;
    if (skipped) store.skip();
    else store.complete();
    const next = usePomodoroStore.getState().timer;
    if (!skipped)
      notifySessionEnd(store.settings.notifications, ended, next.mode);
    setAnnouncement(
      `${MODE_INFO[ended].label} ${skipped ? 'skipped' : 'finished'}. ${MODE_INFO[next.mode].label} ${
        next.isActive ? 'started' : 'ready to start'
      }.`,
    );
  }, []);

  const skip = useCallback(() => end(true), [end]);

  const finish = useCallback(() => {
    const { soundEnabled, volume } = usePomodoroStore.getState().settings;
    end(false);
    if (!soundEnabled) return;
    prime();
    const audio = audioRef.current;
    if (!audio) return;
    // Autoplay can be blocked by the browser: not worth bothering the user.
    try {
      audio.volume = Math.min(1, Math.max(0, (volume ?? 80) / 100));
      audio.currentTime = 0;
      audio.play().catch(reportSoundError);
    } catch (e) {
      reportSoundError(e);
    }
  }, [end, prime]);

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

  return { skip, prime, announcement };
}
