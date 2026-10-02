/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';

const KEY = 'kit:store:tool:calculator';
const load = async () => (await import('./settings')).calculatorSettings;

describe('calculator settings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('keeps history, favourites and memories from the old store', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        state: {
          history: [
            '1+1 = 2',
            { calculation: '2 * 3 = 6', timestamp: '10:00:00' },
          ],
          saved: [{ calculation: '7 * 6 = 42', isFavorite: true }],
          memories: [
            { label: 'M1', value: 5 },
            { label: 'M2', value: null },
            { label: 'M3', value: 9 },
          ],
        },
      }),
    );
    const s = (await load()).getSettings();
    expect(s.history).toEqual([
      { expression: '1+1', result: '2', at: '' },
      { expression: '2 * 3', result: '6', at: '10:00:00' },
    ]);
    expect(s.saved).toEqual([{ expression: '7 * 6', result: '42', at: '' }]);
    expect(s.memories.map((m) => m.value)).toEqual([5, null, 9]);
    expect(s.precision).toBe(14);
  });

  it('imports the pre-store-kit loose keys once', async () => {
    localStorage.setItem('calcHistory', JSON.stringify(['1+1=2']));
    localStorage.setItem('savedCalculations', 'not json');
    const s = (await load()).getSettings();
    expect(s.history).toEqual([{ expression: '1+1', result: '2', at: '' }]);
    expect(localStorage.getItem('calcHistory')).toBeNull();
    expect(localStorage.getItem('savedCalculations')).toBeNull();
  });

  it('starts from defaults with nothing stored', async () => {
    const s = (await load()).getSettings();
    expect(s.mode).toBe('standard');
    expect(s.memories).toHaveLength(3);
  });

  it('persists settings only, with history allowed by name', async () => {
    const { CALCULATOR_DEFAULTS } = await import('./settings');
    expect(() => assertNoDataFields(CALCULATOR_DEFAULTS)).not.toThrow();
  });
});
