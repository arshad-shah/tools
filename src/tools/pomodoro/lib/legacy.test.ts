import { describe, expect, it } from 'vitest';
import { LEGACY_KEY, parseLegacyPomodoro } from './legacy';

const NOW = new Date(2026, 9, 1, 12).getTime();
const persisted = (slices: Record<string, unknown>) =>
  JSON.stringify({
    ...Object.fromEntries(
      Object.entries(slices).map(([k, v]) => [k, JSON.stringify(v)]),
    ),
    _persist: JSON.stringify({ version: -1, rehydrated: true }),
  });

/**
 * A blob as Redux Persist v6 wrote it (persistReducer, key 'pomodoro-store',
 * no version → -1): every slice is a JSON string inside the outer JSON.
 */
const CAPTURED =
  '{"timer":"{\\"mode\\":\\"work\\",\\"timeLeft\\":1312,\\"isActive\\":false,\\"currentTask\\":\\"5f0c6a1e-8a3e-4c1b-9d55-0b6c2b8f9e21\\"}",' +
  '"settings":"{\\"workDuration\\":25,\\"shortBreakDuration\\":5,\\"longBreakDuration\\":15,\\"autoStartBreaks\\":true,\\"autoStartPomodoros\\":false,\\"soundEnabled\\":false}",' +
  '"tasks":"[{\\"title\\":\\"Write report\\",\\"completed\\":false,\\"pomodoros\\":1,\\"completedPomodoros\\":0,\\"id\\":\\"5f0c6a1e-8a3e-4c1b-9d55-0b6c2b8f9e21\\"},{\\"title\\":\\"Review PR\\",\\"completed\\":true,\\"pomodoros\\":1,\\"completedPomodoros\\":1,\\"id\\":\\"a7d2f4c0-1b2e-4f3a-8c9d-6e5f4a3b2c1d\\"}]",' +
  '"stats":"{\\"dailyPomodoros\\":1,\\"weeklyPomodoros\\":7,\\"totalFocusTime\\":175,\\"currentStreak\\":0,\\"lastUpdate\\":1790846400000}",' +
  '"_persist":"{\\"version\\":-1,\\"rehydrated\\":true}"}';

describe('parseLegacyPomodoro', () => {
  it('uses the Redux Persist key', () => {
    expect(LEGACY_KEY).toBe('persist:pomodoro-store');
  });

  it('decodes a captured Redux Persist blob', () => {
    const r = parseLegacyPomodoro(CAPTURED, NOW);
    expect(r).toEqual({
      timer: {
        mode: 'work',
        timeLeft: 1312,
        isActive: false,
        currentTask: '5f0c6a1e-8a3e-4c1b-9d55-0b6c2b8f9e21',
      },
      settings: {
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        autoStartBreaks: true,
        autoStartPomodoros: false,
        soundEnabled: false,
      },
      tasks: [
        {
          id: '5f0c6a1e-8a3e-4c1b-9d55-0b6c2b8f9e21',
          title: 'Write report',
          completed: false,
          pomodoros: 1,
          completedPomodoros: 0,
        },
        {
          id: 'a7d2f4c0-1b2e-4f3a-8c9d-6e5f4a3b2c1d',
          title: 'Review PR',
          completed: true,
          pomodoros: 1,
          completedPomodoros: 1,
        },
      ],
      stats: {
        dailyPomodoros: 1,
        weeklyPomodoros: 7,
        totalFocusTime: 175,
        currentStreak: 0,
        lastUpdate: 1790846400000,
      },
    });
  });

  it('decodes Redux Persist double-encoded slices', () => {
    const r = parseLegacyPomodoro(
      persisted({
        timer: {
          mode: 'shortBreak',
          timeLeft: 120,
          isActive: false,
          currentTask: 't1',
        },
        settings: {
          workDuration: 50,
          shortBreakDuration: 10,
          longBreakDuration: 20,
          autoStartBreaks: false,
          autoStartPomodoros: true,
          soundEnabled: false,
        },
        tasks: [
          {
            id: 't1',
            title: 'Write',
            completed: false,
            pomodoros: 3,
            completedPomodoros: 1,
          },
        ],
        stats: {
          dailyPomodoros: 2,
          weeklyPomodoros: 9,
          totalFocusTime: 300,
          currentStreak: 4,
          lastUpdate: NOW - 1000,
        },
      }),
      NOW,
    );
    expect(r?.timer).toEqual({
      mode: 'shortBreak',
      timeLeft: 120,
      isActive: false,
      currentTask: 't1',
    });
    expect(r?.settings.workDuration).toBe(50);
    expect(r?.tasks[0].title).toBe('Write');
    expect(r?.stats.currentStreak).toBe(4);
  });

  it('fills missing fields from defaults', () => {
    const r = parseLegacyPomodoro(
      persisted({ settings: { workDuration: 40 } }),
      NOW,
    );
    expect(r?.settings).toMatchObject({
      workDuration: 40,
      shortBreakDuration: 5,
      soundEnabled: true,
    });
    expect(r?.tasks).toEqual([]);
    expect(r?.stats.lastUpdate).toBe(NOW);
  });

  it('drops invalid slices and fields', () => {
    const r = parseLegacyPomodoro(
      persisted({
        tasks: 'nope',
        timer: { mode: 'party', timeLeft: 1 },
        settings: { workDuration: 30, shortBreakDuration: 'x' },
        stats: { dailyPomodoros: Number.NaN, weeklyPomodoros: 2 },
      }),
      NOW,
    );
    expect(r?.tasks).toEqual([]);
    expect(r?.timer.mode).toBe('work');
    // The dropped timer takes its time from the migrated work duration.
    expect(r?.timer.timeLeft).toBe(1800);
    expect(r?.settings.workDuration).toBe(30);
    expect(r?.settings.shortBreakDuration).toBe(5);
    expect(r?.stats).toMatchObject({ dailyPomodoros: 0, weeklyPomodoros: 2 });
  });

  it('a missing timer starts from the migrated work duration', () => {
    const r = parseLegacyPomodoro(
      persisted({ settings: { workDuration: 50 } }),
      NOW,
    );
    expect(r?.timer).toEqual({
      mode: 'work',
      timeLeft: 3000,
      isActive: false,
      currentTask: null,
    });
  });

  it('keeps valid tasks and skips malformed ones', () => {
    const r = parseLegacyPomodoro(
      persisted({
        tasks: [
          { id: 'a', title: 'Keep', completed: false, pomodoros: 2 },
          { title: 'no id' },
          null,
        ],
      }),
      NOW,
    );
    expect(r?.tasks).toEqual([
      {
        id: 'a',
        title: 'Keep',
        completed: false,
        pomodoros: 2,
        completedPomodoros: 0,
      },
    ]);
  });

  it('returns null for absent data and throws on malformed JSON', () => {
    expect(parseLegacyPomodoro(null, NOW)).toBeNull();
    expect(
      parseLegacyPomodoro(JSON.stringify({ _persist: '{}' }), NOW),
    ).toBeNull();
    expect(parseLegacyPomodoro('"just a string"', NOW)).toBeNull();
    expect(() => parseLegacyPomodoro('{oops', NOW)).toThrow();
  });
});
