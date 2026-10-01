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
const audioCtor = vi.fn();
class FakeAudio {
  constructor(src: string) {
    audioCtor(src);
  }
  play = play;
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

  it('skip counts once and plays once', async () => {
    const { st, hook } = await setup();
    act(() => hook.result.current.skip());
    expect(st().stats.dailyPomodoros).toBe(1);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('stays silent with sound off and survives a blocked play()', async () => {
    const { st, hook, worker } = await setup();
    act(() => st().updateSettings({ soundEnabled: false }));
    worker.emit({ type: 'COMPLETE' });
    expect(audioCtor).not.toHaveBeenCalled();
    act(() => st().updateSettings({ soundEnabled: true }));
    play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => hook.result.current.skip());
    await Promise.resolve();
    expect(play).toHaveBeenCalledTimes(1);
    err.mockRestore();
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

  it('resumes a persisted running timer on mount', async () => {
    const { usePomodoroStore } = await import('../store');
    usePomodoroStore.setState({
      timer: { mode: 'work', timeLeft: 600, isActive: true, currentTask: 'x' },
    });
    const { useTimerWorker } = await import('./useTimerWorker');
    renderHook(() => useTimerWorker());
    expect(FakeWorker.instances.at(-1)!.posted).toEqual([
      { type: 'STOP' },
      { type: 'START', payload: { timeLeft: 600 } },
    ]);
  });
});
