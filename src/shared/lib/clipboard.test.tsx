/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useClipboard } from './clipboard';

describe('useClipboard', () => {
  it('copies and flips copied for resetMs', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const { result } = renderHook(() => useClipboard(1000));

    let ok = false;
    await act(async () => {
      ok = await result.current.copy('hello');
    });
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(result.current.copied).toBe(true);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.copied).toBe(false);
    vi.useRealTimers();
  });

  it('returns false when the clipboard rejects', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    const { result } = renderHook(() => useClipboard());
    let ok = true;
    await act(async () => {
      ok = await result.current.copy('x');
    });
    expect(ok).toBe(false);
    expect(result.current.copied).toBe(false);
  });
});
