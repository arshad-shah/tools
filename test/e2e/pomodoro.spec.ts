import { expect, test, type Page } from '@playwright/test';

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

// ToolLayout renders the page h1; the timer is the tool's own h1.
const timerHeading = (page: Page) =>
  page.getByRole('heading', { level: 1 }).last();

test('existing Redux Persist data survives the migration', async ({ page }) => {
  await seedLegacy(page);
  await page.goto('/pomodoro');
  await expect(timerHeading(page)).toHaveText('30:00');
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
  await page.goto('/pomodoro');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(timerHeading(page)).not.toHaveText('30:00', { timeout: 5_000 });
  await page.getByRole('button', { name: 'Pause' }).click();
  const shown = await timerHeading(page).textContent();
  await page.reload();
  await expect(timerHeading(page)).toHaveText(shown!);
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
});

test('a finished work session counts once, chimes once and the break auto-starts', async ({
  page,
}) => {
  // Count chimes without relying on autoplay in headless Chromium.
  await page.addInitScript(() => {
    const w = window as unknown as { __chimes: string[] };
    w.__chimes = [];
    window.Audio = class {
      constructor(src: string) {
        w.__chimes.push(src);
      }
      play() {
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
  await page.goto('/pomodoro');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Short Break' }),
  ).toBeVisible({ timeout: 10_000 });
  // The auto-started break really counts down (it used to sit at 05:00).
  await expect(timerHeading(page)).not.toHaveText('05:00', { timeout: 5_000 });
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  const saved = await page.evaluate(
    (kitKey) => JSON.parse(localStorage.getItem(kitKey) ?? '{}'),
    KIT_KEY,
  );
  expect(saved.state.stats.dailyPomodoros).toBe(1);
  expect(saved.state.stats.currentStreak).toBe(1);
  expect(saved.state.tasks[0].completedPomodoros).toBe(1);
  const chimes = await page.evaluate(
    () => (window as unknown as { __chimes: string[] }).__chimes,
  );
  expect(chimes).toHaveLength(1);
  const sound = await page.request.get(chimes[0]);
  expect(sound.ok()).toBe(true);
  expect((await sound.body()).subarray(0, 4).toString()).toBe('RIFF');
});
