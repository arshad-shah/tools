/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('calculator store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });
  it('imports the three legacy keys and removes them', async () => {
    localStorage.setItem('calcHistory', JSON.stringify(['1+1=2']));
    localStorage.setItem(
      'savedCalculations',
      JSON.stringify([{ calculation: '2*3=6', isFavorite: true }]),
    );
    localStorage.setItem(
      'memories',
      JSON.stringify([
        { label: 'M1', value: 5 },
        { label: 'M2', value: null },
        { label: 'M3', value: null },
      ]),
    );
    const { useCalculatorStore } = await import('./store');
    const s = useCalculatorStore.getState();
    expect(s.history).toEqual(['1+1=2']);
    expect(s.saved[0].calculation).toBe('2*3=6');
    expect(s.memories[0].value).toBe(5);
    ['calcHistory', 'savedCalculations', 'memories'].forEach((k) =>
      expect(localStorage.getItem(k)).toBeNull(),
    );
    expect(localStorage.getItem('kit:store:tool:calculator')).toContain(
      '1+1=2',
    );
  });
  it('keeps defaults for fields whose key is absent', async () => {
    localStorage.setItem('calcHistory', JSON.stringify(['x']));
    const { useCalculatorStore } = await import('./store');
    expect(useCalculatorStore.getState().history).toEqual(['x']);
    expect(useCalculatorStore.getState().saved).toEqual([]);
    expect(useCalculatorStore.getState().memories).toHaveLength(3);
  });
  it('falls back to defaults on malformed legacy JSON', async () => {
    localStorage.setItem('calcHistory', 'not json');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { useCalculatorStore } = await import('./store');
    expect(useCalculatorStore.getState().history).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  it('setters accept a value or an updater, like setState', async () => {
    const { useCalculatorStore } = await import('./store');
    const { setHistory, setSaved, setMemories } = useCalculatorStore.getState();
    setHistory((h) => [...h, 'a']);
    setHistory((h) => [...h, 'b']);
    expect(useCalculatorStore.getState().history).toEqual(['a', 'b']);
    setSaved([{ calculation: 'c', isFavorite: false }]);
    expect(useCalculatorStore.getState().saved).toHaveLength(1);
    setMemories((m) => m.map((r) => ({ ...r, value: 1 })));
    expect(useCalculatorStore.getState().memories.every((r) => r.value)).toBe(
      true,
    );
  });
});
