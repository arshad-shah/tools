/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiffSettings } from '../types';

const error = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/notify', () => ({
  notify: { error, success: vi.fn(), info: vi.fn() },
}));

const failNext = vi.hoisted(() => ({ value: false }));
vi.mock('diff', async (importOriginal) => {
  const actual = await importOriginal<typeof import('diff')>();
  return {
    ...actual,
    diffWordsWithSpace: (a: string, b: string) => {
      if (failNext.value) throw new Error('boom');
      return actual.diffWordsWithSpace(a, b);
    },
  };
});

import { useIntelligentDiff } from './useIntelligentDiff';

const SETTINGS: DiffSettings = {
  ignoreWhitespace: false,
  ignoreCase: false,
  wordByWord: false,
  showLineNumbers: true,
  contextLines: 3,
  trimTrailingWhitespace: true,
  highlightIntralineChanges: true,
  syntaxHighlighting: false,
  ignoreEmptyLines: false,
  trimNewlines: false,
};

describe('useIntelligentDiff debounced (auto) diff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    error.mockClear();
    failNext.value = false;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('diffs after the debounce delay', () => {
    const { result } = renderHook(() => useIntelligentDiff());
    act(() => result.current.debouncedCalculateDiff('a b', 'a c', SETTINGS));
    expect(result.current.diffSegments).toEqual([]);
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.diffSegments.length).toBeGreaterThan(0);
    expect(error).not.toHaveBeenCalled();
  });

  it('reports a failed diff with a toast instead of throwing from the timer', () => {
    failNext.value = true;
    const { result } = renderHook(() => useIntelligentDiff());
    act(() => result.current.debouncedCalculateDiff('a b', 'a c', SETTINGS));
    expect(() => act(() => vi.advanceTimersByTime(300))).not.toThrow();
    expect(error).toHaveBeenCalledWith('Error calculating differences');
    expect(result.current.isDiffing).toBe(false);
  });
});
