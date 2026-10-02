/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const KEY = 'kit:store:tool:app-favorites';

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('favourites', () => {
  it('imports the legacy favoriteTools key once', async () => {
    localStorage.setItem('favoriteTools', JSON.stringify(['regex-tester']));
    const { useFavorites } = await import('./favorites');
    const { result } = renderHook(() => useFavorites());
    expect(result.current.ids).toEqual(['regex-tester']);
    expect(result.current.isFavorite('regex-tester')).toBe(true);
    expect(localStorage.getItem('favoriteTools')).toBeNull();
  });
  it('toggles and persists under the kit store key', async () => {
    const { useFavorites } = await import('./favorites');
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle('pomodoro'));
    expect(result.current.ids).toEqual(['pomodoro']);
    expect(localStorage.getItem(KEY)).toContain('pomodoro');
    act(() => result.current.toggle('pomodoro'));
    expect(result.current.ids).toEqual([]);
  });
});
