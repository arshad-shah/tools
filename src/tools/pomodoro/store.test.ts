/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const legacyBlob = (slices: Record<string, unknown>) =>
  JSON.stringify({
    ...Object.fromEntries(
      Object.entries(slices).map(([k, v]) => [k, JSON.stringify(v)]),
    ),
    _persist: JSON.stringify({ version: -1, rehydrated: true }),
  });

describe('pomodoro store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('migrates persist:pomodoro-store into kit:store:tool:pomodoro', async () => {
    localStorage.setItem(
      'persist:pomodoro-store',
      legacyBlob({
        tasks: [
          {
            id: 'a',
            title: 'Keep me',
            completed: false,
            pomodoros: 1,
            completedPomodoros: 0,
          },
        ],
        settings: {
          workDuration: 45,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          autoStartBreaks: true,
          autoStartPomodoros: false,
          soundEnabled: false,
        },
        stats: {
          dailyPomodoros: 0,
          weeklyPomodoros: 12,
          totalFocusTime: 300,
          currentStreak: 2,
          lastUpdate: Date.now(),
        },
      }),
    );
    const { usePomodoroStore } = await import('./store');
    const s = usePomodoroStore.getState();
    expect(s.tasks[0].title).toBe('Keep me');
    expect(s.settings.workDuration).toBe(45);
    expect(s.settings.soundEnabled).toBe(false);
    expect(s.stats.weeklyPomodoros).toBe(12);
    expect(localStorage.getItem('persist:pomodoro-store')).toBeNull();
    expect(localStorage.getItem('kit:store:tool:pomodoro')).toContain(
      'Keep me',
    );
  });

  it('does not re-import once the store has its own data', async () => {
    localStorage.setItem(
      'kit:store:tool:pomodoro',
      JSON.stringify({ state: { tasks: [] }, version: 1 }),
    );
    localStorage.setItem(
      'persist:pomodoro-store',
      legacyBlob({ tasks: [{ id: 'x', title: 'Old' }] }),
    );
    const { usePomodoroStore } = await import('./store');
    expect(usePomodoroStore.getState().tasks).toEqual([]);
  });

  it('starts from defaults and keeps the legacy key when it is malformed', async () => {
    localStorage.setItem('persist:pomodoro-store', '{oops');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { usePomodoroStore } = await import('./store');
    expect(usePomodoroStore.getState().tasks).toEqual([]);
    expect(usePomodoroStore.getState().settings.workDuration).toBe(25);
    expect(localStorage.getItem('persist:pomodoro-store')).toBe('{oops');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('toggle refuses to start work without a task, then starts once a task is current', async () => {
    const { usePomodoroStore } = await import('./store');
    const s = usePomodoroStore.getState();
    s.toggle();
    expect(usePomodoroStore.getState().timer.isActive).toBe(false);
    s.addTask('T');
    s.setCurrentTask(usePomodoroStore.getState().tasks[0].id);
    usePomodoroStore.getState().toggle();
    expect(usePomodoroStore.getState().timer.isActive).toBe(true);
    usePomodoroStore.getState().toggle();
    expect(usePomodoroStore.getState().timer.isActive).toBe(false);
  });

  it('complete() applies the session transition once', async () => {
    const { usePomodoroStore } = await import('./store');
    usePomodoroStore.getState().complete();
    expect(usePomodoroStore.getState().stats.dailyPomodoros).toBe(1);
    expect(usePomodoroStore.getState().timer.mode).toBe('shortBreak');
  });

  it('tick sets timeLeft and rolls the day over', async () => {
    const { usePomodoroStore } = await import('./store');
    const yesterday = Date.now() - 86_400_000 * 2;
    usePomodoroStore.setState({
      stats: {
        ...usePomodoroStore.getState().stats,
        dailyPomodoros: 3,
        lastUpdate: yesterday,
      },
    });
    usePomodoroStore.getState().tick(100);
    expect(usePomodoroStore.getState().timer.timeLeft).toBe(100);
    expect(usePomodoroStore.getState().stats.dailyPomodoros).toBe(0);
  });

  it('task, settings and mode actions delegate to the session logic', async () => {
    const { usePomodoroStore } = await import('./store');
    const st = () => usePomodoroStore.getState();
    st().addTask('A');
    st().addTask('B');
    const [a, b] = st().tasks;
    expect(a.id).not.toBe(b.id);
    st().setCurrentTask(a.id);
    st().toggleTask(a.id);
    expect(st().timer.currentTask).toBe(b.id);
    st().deleteTask(b.id);
    expect(st().timer.currentTask).toBeNull();
    st().updateSettings({ shortBreakDuration: 7 });
    st().selectMode('shortBreak');
    expect(st().timer.timeLeft).toBe(420);
    st().tick(5);
    st().resetTimer();
    expect(st().timer.timeLeft).toBe(420);
  });
});
