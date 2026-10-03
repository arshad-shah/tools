import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';

const KIT_KEY = 'kit:store:tool:pomodoro';
const LEGACY_KEY = 'persist:pomodoro-store';

// What Redux Persist v6 wrote: every slice is a JSON string in the outer JSON.
const legacy = JSON.stringify({
  timer: JSON.stringify({
    mode: 'work',
    timeLeft: 1800,
    isActive: false,
    currentTask: 't1',
  }),
  settings: JSON.stringify({
    workDuration: 30,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    autoStartBreaks: true,
    autoStartPomodoros: false,
    soundEnabled: false,
  }),
  tasks: JSON.stringify([
    {
      id: 't1',
      title: 'Write report',
      completed: false,
      pomodoros: 2,
      completedPomodoros: 1,
    },
  ]),
  stats: JSON.stringify({
    dailyPomodoros: 0,
    weeklyPomodoros: 3,
    totalFocusTime: 90,
    currentStreak: 1,
    lastUpdate: Date.now(),
  }),
  _persist: JSON.stringify({ version: -1, rehydrated: true }),
});

/** Seeds the legacy key on the first load only (not again after reload). */
async function seedLegacy(page: Page) {
  await page.addInitScript(
    ([kitKey, legacyKey, value]) => {
      if (!localStorage.getItem(kitKey)) {
        localStorage.setItem(legacyKey, value);
      }
    },
    [KIT_KEY, LEGACY_KEY, legacy],
  );
}

// The countdown is a role="timer" element (ToolPage owns the page h1).
const timerHeading = (page: Page) => page.getByRole('timer');

test('existing Redux Persist data survives the migration', async ({ page }) => {
  await seedLegacy(page);
  await page.goto(pathOf('pomodoro'));
  await expect(timerHeading(page)).toHaveText('30:00');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByText('Write report')).toBeVisible();
  await expect(page.getByText('1/2 pomodoros')).toBeVisible();
  const keys = await page.evaluate(
    ([kitKey, legacyKey]) => ({
      legacy: localStorage.getItem(legacyKey),
      kit: localStorage.getItem(kitKey),
    }),
    [KIT_KEY, LEGACY_KEY],
  );
  expect(keys.legacy).toBeNull();
  expect(keys.kit).toContain('Write report');

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('tab', { name: 'Settings' }).click();
  await expect(page.getByText('30 min', { exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: /Sound/ })).not.toBeChecked();
});

test('start counts down and pause stops; state persists across reload', async ({
  page,
}) => {
  await seedLegacy(page);
  await page.goto(pathOf('pomodoro'));
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(timerHeading(page)).not.toHaveText('30:00', { timeout: 5_000 });
  await page.getByRole('button', { name: 'Pause' }).click();
  const shown = await timerHeading(page).textContent();
  await page.reload();
  await expect(timerHeading(page)).toHaveText(shown!);
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
});

test('a running timer keeps going across a reload, with the time really left', async ({
  page,
}) => {
  await seedLegacy(page);
  await page.goto(pathOf('pomodoro'));
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(timerHeading(page)).toHaveText('29:59', { timeout: 5_000 });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  // Wall-clock based: never back at the full 30:00 after the reload.
  await expect(timerHeading(page)).not.toHaveText('30:00');
  await expect(timerHeading(page)).toHaveText(/^29:5\d$/, { timeout: 5_000 });
});

test('a finished work session counts once, chimes once and the break auto-starts', async ({
  page,
}) => {
  // Count sound elements and plays without relying on autoplay in headless
  // Chromium.
  await page.addInitScript(() => {
    const w = window as unknown as { __sounds: string[]; __plays: number };
    w.__sounds = [];
    w.__plays = 0;
    window.Audio = class {
      preload = '';
      currentTime = 0;
      constructor(src: string) {
        w.__sounds.push(src);
      }
      load() {}
      play() {
        w.__plays++;
        return Promise.resolve();
      }
    } as unknown as typeof Audio;
  });
  await page.addInitScript((kitKey) => {
    if (localStorage.getItem(kitKey)) return;
    localStorage.setItem(
      kitKey,
      JSON.stringify({
        version: 1,
        state: {
          timer: {
            mode: 'work',
            timeLeft: 2,
            isActive: false,
            currentTask: 't1',
          },
          settings: {
            workDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            autoStartBreaks: true,
            autoStartPomodoros: false,
            soundEnabled: true,
          },
          tasks: [
            {
              id: 't1',
              title: 'Ship it',
              completed: false,
              pomodoros: 3,
              completedPomodoros: 0,
            },
          ],
          stats: {
            dailyPomodoros: 0,
            weeklyPomodoros: 0,
            totalFocusTime: 0,
            currentStreak: 0,
            lastUpdate: Date.now(),
          },
        },
      }),
    );
  }, KIT_KEY);
  await page.goto(pathOf('pomodoro'));
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Short Break' }),
  ).toBeVisible({ timeout: 10_000 });
  // The auto-started break really counts down (it used to sit at 05:00).
  await expect(timerHeading(page)).not.toHaveText('05:00', { timeout: 5_000 });
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(
    page.getByText('Focus Time finished. Short Break started.'),
  ).toBeAttached();
  const saved = await page.evaluate(
    (kitKey) => JSON.parse(localStorage.getItem(kitKey) ?? '{}'),
    KIT_KEY,
  );
  expect(saved.state.stats.dailyPomodoros).toBe(1);
  expect(saved.state.stats.currentStreak).toBe(1);
  expect(saved.state.tasks[0].completedPomodoros).toBe(1);
  const { sounds, plays } = await page.evaluate(() => {
    const w = window as unknown as { __sounds: string[]; __plays: number };
    return { sounds: w.__sounds, plays: w.__plays };
  });
  // One element, preloaded on Start, played exactly once.
  expect(sounds).toHaveLength(1);
  expect(plays).toBe(1);
  const sound = await page.request.get(sounds[0]);
  expect(sound.ok()).toBe(true);
  expect((await sound.body()).subarray(0, 4).toString()).toBe('RIFF');
});

test('a long break follows the 4th completed work session', async ({
  page,
}) => {
  // The countdown worker runs on real time, but the store recomputes a
  // running session from its wall-clock end on load: fast-forward the page
  // clock past each session's end and reload, and the session completes.
  // A fixed morning start: the ~2 h of sessions must stay on one local day,
  // or the history splits them across midnight.
  await page.clock.install({ time: new Date(2026, 0, 15, 9, 0, 0) });
  await page.goto(pathOf('pomodoro'));
  const heading = (name: string) =>
    page.getByRole('heading', { level: 2, name });
  const finishSession = async (minutes: number, next: string) => {
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await page.clock.fastForward(minutes * 60_000 + 1_000);
    await page.reload();
    await expect(heading(next)).toBeVisible();
  };
  await expect(heading('Focus Time')).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await finishSession(25, 'Short Break');
    await finishSession(5, 'Focus Time');
  }
  await expect(page.getByText('Long break after this session')).toBeVisible();
  await finishSession(25, 'Long Break');
  await expect(timerHeading(page)).toHaveText('15:00');
  const saved = await page.evaluate(
    (kitKey) => JSON.parse(localStorage.getItem(kitKey) ?? '{}'),
    KIT_KEY,
  );
  expect(saved.state.timer.completedWork).toBe(4);
  expect(saved.state.history[0].workSessions).toBe(4);
});

test('Space starts and pauses the timer; F opens the focus view', async ({
  page,
}) => {
  await page.goto(pathOf('pomodoro'));
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();

  await page.keyboard.press('f');
  const focus = page.getByRole('dialog', { name: 'Focus view' });
  await expect(focus).toBeVisible();
  await expect(focus.getByText('25:00')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(focus).toBeHidden();
});

test('the history tab charts finished sessions and exports CSV', async ({
  page,
}) => {
  await page.addInitScript((kitKey) => {
    if (localStorage.getItem(kitKey)) return;
    const d = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    const today = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
    localStorage.setItem(
      kitKey,
      JSON.stringify({
        version: 1,
        state: {
          history: [
            { date: today, workSessions: 2, workMinutes: 50, breaks: 1 },
          ],
        },
      }),
    );
  }, KIT_KEY);
  await page.goto(pathOf('pomodoro'));
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(
    page.getByRole('img', { name: 'Work sessions, last 7 days' }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Work sessions, last 12 weeks' }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await download).suggestedFilename()).toBe('pomodoro-history.csv');
});
