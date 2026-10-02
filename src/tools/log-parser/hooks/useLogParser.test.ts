/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useLogParser } from './useLogParser';

describe('useLogParser', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  // B8: the hidden dark-mode toggle used to rewrite <html class> globally.
  it('leaves the document theme and localStorage alone', () => {
    document.documentElement.classList.add('dark');
    const { result } = renderHook(() => useLogParser());
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('darkMode')).toBeNull();
    expect(result.current).not.toHaveProperty('darkMode');
  });

  it('derives parsed logs from the text and type, and clears them', () => {
    const { result } = renderHook(() => useLogParser());
    expect(result.current.parsedLogs).toEqual([]);
    act(() => result.current.loadSampleLogs());
    expect(result.current.parsedLogs).toHaveLength(10);
    expect(result.current.logCounts.error).toBe(2);
    act(() => result.current.setLogType('generic'));
    expect(result.current.parsedLogs[0].component).toBeUndefined();
    act(() => result.current.toggleLevelFilter('error'));
    expect(result.current.filteredLogs).toHaveLength(8);
    act(() => result.current.clearLogs());
    expect(result.current.parsedLogs).toEqual([]);
    expect(result.current.logText).toBe('');
  });
});
