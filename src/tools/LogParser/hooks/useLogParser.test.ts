/** @vitest-environment jsdom */
import { renderHook } from '@testing-library/react';
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
});
