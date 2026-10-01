/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { createToolStore } from './createToolStore';

afterEach(() => localStorage.clear());

describe('createToolStore', () => {
  it('names the store tool:<id> and persists settings to localStorage', () => {
    const store = createToolStore({
      toolId: 'demo',
      initial: { mode: 'a' as 'a' | 'b' },
      actions: (set) => ({ setMode: (mode: 'a' | 'b') => set({ mode }) }),
    });
    store.getState().setMode('b');
    expect(store.getState().mode).toBe('b');
    const raw = localStorage.getItem('kit:store:tool:demo');
    expect(raw).toContain('"mode":"b"');
    store.reset();
    expect(store.getState().mode).toBe('a');
    store.destroy();
  });

  it('does not persist when persist is false', () => {
    const store = createToolStore({
      toolId: 'mem',
      initial: { n: 1 },
      persist: false,
    });
    store.setState({ n: 2 });
    expect(localStorage.getItem('kit:store:tool:mem')).toBeNull();
    store.destroy();
  });
});
