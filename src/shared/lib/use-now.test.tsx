/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow } from './use-now';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:20Z'));
});
afterEach(() => vi.useRealTimers());

describe('useNow', () => {
  it('ticks every interval', () => {
    const { result } = renderHook(() => useNow(1000));
    const start = result.current;
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(start + 1000);
  });

  it('aligned ticks land on the interval boundary', () => {
    const { result } = renderHook(() => useNow(60_000, { align: true }));
    act(() => vi.advanceTimersByTime(39_999));
    expect(new Date(result.current).getUTCSeconds()).toBe(20);
    act(() => vi.advanceTimersByTime(1));
    expect(new Date(result.current).toISOString()).toBe(
      '2026-01-01T00:01:00.000Z',
    );
    act(() => vi.advanceTimersByTime(60_000));
    expect(new Date(result.current).toISOString()).toBe(
      '2026-01-01T00:02:00.000Z',
    );
  });

  it('stops on unmount', () => {
    const { unmount } = renderHook(() => useNow(1000, { align: true }));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
