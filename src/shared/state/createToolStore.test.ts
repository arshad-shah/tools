/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('createToolStore legacy import', () => {
  beforeEach(() => localStorage.clear());

  const kitKeyFor = (id: string) => `kit:store:tool:${id}`;
  let n = 0;
  const make = (
    read = (raw: Record<string, string | null>) =>
      raw.old ? { items: JSON.parse(raw.old) as string[] } : null,
  ) => {
    const toolId = `legacy-${++n}`;
    return {
      toolId,
      store: createToolStore<{ items: string[] }>({
        toolId,
        initial: { items: [] },
        legacy: { keys: ['old'], read },
      }),
    };
  };

  it('imports once, persists under the kit key and removes the legacy key', () => {
    localStorage.setItem('old', JSON.stringify(['a', 'b']));
    const { store, toolId } = make();
    expect(store.getState().items).toEqual(['a', 'b']);
    expect(localStorage.getItem('old')).toBeNull();
    expect(
      JSON.parse(localStorage.getItem(kitKeyFor(toolId))!).state.items,
    ).toEqual(['a', 'b']);
  });

  it('does nothing when no legacy key is present', () => {
    const read = vi.fn(() => null);
    const { store, toolId } = make(read);
    expect(read).not.toHaveBeenCalled();
    expect(store.getState().items).toEqual([]);
    expect(localStorage.getItem(kitKeyFor(toolId))).toBeNull();
  });

  it('ignores legacy data when the kit key already exists', () => {
    localStorage.setItem(
      kitKeyFor('legacy-existing'),
      JSON.stringify({ version: 1, state: { items: ['kept'] } }),
    );
    localStorage.setItem('old', JSON.stringify(['stale']));
    const store = createToolStore<{ items: string[] }>({
      toolId: 'legacy-existing',
      initial: { items: [] },
      legacy: {
        keys: ['old'],
        read: (raw) => ({ items: JSON.parse(raw.old!) as string[] }),
      },
    });
    expect(store.getState().items).toEqual(['kept']);
    expect(localStorage.getItem('old')).not.toBeNull();
  });

  it('falls back to defaults and keeps the legacy key when read throws', () => {
    localStorage.setItem('old', '{not json');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { store } = make((raw) => ({
      items: JSON.parse(raw.old!) as string[],
    }));
    expect(store.getState().items).toEqual([]);
    expect(localStorage.getItem('old')).toBe('{not json');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(':legacy]'),
      expect.anything(),
    );
    warn.mockRestore();
  });

  it('keeps the legacy key when the imported state could not be saved', () => {
    localStorage.setItem('old', JSON.stringify(['a', 'b']));
    const realSetItem = Storage.prototype.setItem;
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, key: string, value: string) {
        if (key.startsWith('kit:store:tool:')) {
          throw new DOMException('full', 'QuotaExceededError');
        }
        realSetItem.call(this, key, value);
      });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { store, toolId } = make();
    // Still usable this session, but the old data is not thrown away.
    expect(store.getState().items).toEqual(['a', 'b']);
    expect(localStorage.getItem(kitKeyFor(toolId))).toBeNull();
    expect(localStorage.getItem('old')).toBe(JSON.stringify(['a', 'b']));
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(':legacy]'),
      expect.anything(),
    );
    setItem.mockRestore();
    warn.mockRestore();
  });

  it('removes the legacy keys when read finds nothing to import', () => {
    localStorage.setItem('old', '');
    const { store } = make();
    expect(store.getState().items).toEqual([]);
    expect(localStorage.getItem('old')).toBeNull();
  });

  it('reset() returns to defaults, not to the imported data', () => {
    localStorage.setItem('old', JSON.stringify(['a']));
    const { store } = make();
    store.reset();
    expect(store.getState().items).toEqual([]);
  });

  it('skips the import when persistence is off', () => {
    localStorage.setItem('old', JSON.stringify(['a']));
    const store = createToolStore<{ items: string[] }>({
      toolId: 'legacy-mem',
      initial: { items: [] },
      persist: false,
      legacy: {
        keys: ['old'],
        read: (raw) => ({ items: JSON.parse(raw.old!) as string[] }),
      },
    });
    expect(store.getState().items).toEqual([]);
    expect(localStorage.getItem('old')).not.toBeNull();
  });
});
