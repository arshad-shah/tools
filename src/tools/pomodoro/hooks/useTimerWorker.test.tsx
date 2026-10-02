/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

class FakeWorker {
  static instances: FakeWorker[] = [];
  posted: unknown[] = [];
  terminated = false;
  onmessage: ((e: MessageEvent) => void) | null = null;
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(msg: unknown) {
    this.posted.push(msg);
  }
  terminate() {
    this.terminated = true;
  }
  emit(data: unknown) {
    act(() => this.onmessage?.({ data } as MessageEvent));
  }
}

const play = vi.fn<() => Promise<void>>();
const load = vi.fn();
const audioCtor = vi.fn();
class FakeAudio {
  preload = '';
  currentTime = 0;
  constructor(src: string) {
    audioCtor(src);
  }
  play = play;
  load = load;
}

async function setup() {
  const { usePomodoroStore } = await import('../store');
  const { useTimerWorker } = await import('./useTimerWorker');
  const st = usePomodoroStore.getState;
  st().addTask('Focus');
  st().setCurrentTask(st().tasks[0].id);
  const hook = renderHook(() => useTimerWorker());
  const worker = FakeWorker.instances.at(-1)!;
  return { st, hook, worker };
}

describe('useTimerWorker', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('Audio', FakeAudio);
    play.mockReset().mockResolvedValue(undefined);
    audioCtor.mockReset();
    load.mockReset();
  });

  it('counts a completed work session once and plays the sound once (B5)', async () => {
    // Old code: the Redux listener and the component's handler both counted
    // the session and both played the sound.
    const { st, worker } = await setup();
    act(() => st().toggle());
    worker.emit({ type: 'TICK', timeLeft: 0 });
    worker.emit({ type: 'COMPLETE' });
    expect(st().stats.dailyPomodoros).toBe(1);
    expect(st().tasks[0].completedPomodoros).toBe(1);
    expect(audioCtor).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('restarts the worker when a break auto-starts (B5)', async () => {
    // Old code: isActive stayed true across the mode change, so START was
    // never posted again and the auto-started break sat still.
    const { st, worker } = await setup();
    act(() => st().toggle());
    expect(worker.posted.at(-1)).toEqual({
      type: 'START',
      payload: { timeLeft: 1500 },
    });
    worker.posted = [];
    worker.emit({ type: 'COMPLETE' });
    expect(st().timer).toMatchObject({ mode: 'shortBreak', isActive: true });
    expect(worker.posted).toEqual([
      { type: 'STOP' },
      { type: 'START', payload: { timeLeft: 300 } },
    ]);
  });

  it('a finished break does not advance the task (B5)', async () => {
    const { st, worker } = await setup();
    act(() => st().selectMode('shortBreak'));
    act(() => st().toggle());
    worker.emit({ type: 'COMPLETE' });
    expect(st().tasks[0].completedPomodoros).toBe(0);
    expect(st().stats.dailyPomodoros).toBe(0);
    expect(st().timer).toMatchObject({ mode: 'work', isActive: false });
    expect(worker.posted.at(-1)).toEqual({ type: 'STOP' });
  });

  it('skip moves on without counting or a chime', async () => {
    const { st, hook } = await setup();
    act(() => hook.result.current.skip());
    expect(st().stats.dailyPomodoros).toBe(0);
    expect(st().timer.mode).toBe('shortBreak');
    expect(play).not.toHaveBeenCalled();
  });

  it('a real end counts once and plays once', async () => {
    const { st, worker } = await setup();
    worker.emit({ type: 'COMPLETE' });
    expect(st().stats.dailyPomodoros).toBe(1);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('stays silent with sound off and survives a blocked play()', async () => {
    const { st, worker } = await setup();
    act(() => st().updateSettings({ soundEnabled: false }));
    worker.emit({ type: 'COMPLETE' });
    expect(audioCtor).not.toHaveBeenCalled();
    act(() => st().updateSettings({ soundEnabled: true }));
    play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    worker.emit({ type: 'COMPLETE' });
    expect(play).toHaveBeenCalledTimes(1);
    // The rejection is handled and reported through logToolError (dev only).
    await vi.waitFor(() =>
      expect(err).toHaveBeenCalledWith(
        expect.stringMatching(/blocked|completion sound/),
        expect.any(DOMException),
      ),
    );
    err.mockRestore();
  });

  it('prime() preloads one sound on the first Start; every chime reuses it (review M6)', async () => {
    const { st, hook, worker } = await setup();
    act(() => hook.result.current.prime());
    act(() => hook.result.current.prime());
    expect(audioCtor).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);
    act(() => st().toggle());
    worker.emit({ type: 'COMPLETE' }); // work → break
    worker.emit({ type: 'COMPLETE' }); // break → work
    expect(audioCtor).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(2);
  });

  it('announces the end of each session for screen readers (review M8)', async () => {
    const { st, hook, worker } = await setup();
    expect(hook.result.current.announcement).toBe('');
    act(() => st().toggle());
    worker.emit({ type: 'COMPLETE' });
    expect(hook.result.current.announcement).toBe(
      'Focus Time finished. Short Break started.',
    );
    worker.emit({ type: 'COMPLETE' });
    expect(hook.result.current.announcement).toBe(
      'Short Break finished. Focus Time ready to start.',
    );
  });

  it('ticks update the store and the title; unmount terminates and restores the title', async () => {
    document.title = 'Tools';
    const { st, hook, worker } = await setup();
    worker.emit({ type: 'TICK', timeLeft: 1499 });
    expect(st().timer.timeLeft).toBe(1499);
    expect(document.title).toBe('Pomodoro - Work - 24:59');
    hook.unmount();
    expect(worker.terminated).toBe(true);
    expect(document.title).toBe('Tools');
  });

  it('resumes a persisted running timer with the time really left', async () => {
    const { usePomodoroStore } = await import('../store');
    // Closed with 10:00 left; reopened 4 minutes later.
    usePomodoroStore.setState({
      timer: {
        mode: 'work',
        timeLeft: 600,
        isActive: true,
        currentTask: 'x',
        endsAt: Date.now() + 360_000,
      },
    });
    const { useTimerWorker } = await import('./useTimerWorker');
    renderHook(() => useTimerWorker());
    const posted = FakeWorker.instances.at(-1)!.posted as {
      type: string;
      payload?: { timeLeft: number };
    }[];
    expect(posted.at(-1)?.type).toBe('START');
    expect(posted.at(-1)?.payload?.timeLeft).toBeGreaterThan(355);
    expect(posted.at(-1)?.payload?.timeLeft).toBeLessThanOrEqual(360);
    expect(posted.filter((m) => m.type === 'START')).toHaveLength(1);
  });

  it('a session that ended while closed counts once, silently, and waits paused (review M2)', async () => {
    const { usePomodoroStore } = await import('../store');
    usePomodoroStore.setState({
      timer: {
        mode: 'work',
        timeLeft: 600,
        isActive: true,
        currentTask: null,
        endsAt: Date.now() - 60_000,
      },
    });
    const { useTimerWorker } = await import('./useTimerWorker');
    renderHook(() => useTimerWorker());
    const st = usePomodoroStore.getState();
    // totalFocusTime never resets, so this holds even across midnight.
    expect(st.stats.totalFocusTime).toBe(25);
    expect(st.timer).toMatchObject({ mode: 'shortBreak', isActive: false });
    expect(FakeWorker.instances.at(-1)!.posted).not.toContainEqual(
      expect.objectContaining({ type: 'START' }),
    );
    expect(audioCtor).not.toHaveBeenCalled();
  });

  it('notifies at a session end only when opted in and the tab is hidden', async () => {
    const shown: string[] = [];
    vi.stubGlobal(
      'Notification',
      class {
        static permission = 'granted';
        constructor(title: string) {
          shown.push(title);
        }
      },
    );
    let hidden = false;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => hidden,
    });
    const { st, worker } = await setup();
    worker.emit({ type: 'COMPLETE' });
    expect(shown).toEqual([]);
    act(() => st().updateSettings({ notifications: true }));
    worker.emit({ type: 'COMPLETE' });
    expect(shown).toEqual([]);
    hidden = true;
    worker.emit({ type: 'COMPLETE' });
    expect(shown).toEqual(['Focus Time finished']);
    hidden = false;
  });

  it('plays the chosen sound at the chosen volume', async () => {
    const { st, worker } = await setup();
    act(() => st().updateSettings({ sound: 'bell', volume: 40 }));
    worker.emit({ type: 'COMPLETE' });
    expect(audioCtor).toHaveBeenCalledWith(expect.stringContaining('bell'));
  });
});
