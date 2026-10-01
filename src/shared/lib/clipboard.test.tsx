/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readClipboardText, useClipboard } from './clipboard';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), toast) }));

describe('useClipboard', () => {
  afterEach(() => {
    vi.useRealTimers();
    toast.error.mockClear();
  });

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
    expect(toast.error).toHaveBeenCalledWith('Could not copy to clipboard');
  });

  it('tracks the key of the last copy', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    const { result } = renderHook(() => useClipboard());
    await act(async () => {
      await result.current.copy('#ff0000', 'hex');
    });
    expect(result.current.copiedKey).toBe('hex');
    expect(result.current.copied).toBe(true);
  });

  it('uses the default key when none is given', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    const { result } = renderHook(() => useClipboard());
    await act(async () => {
      await result.current.copy('x');
    });
    expect(result.current.copiedKey).toBe('default');
  });
});

describe('readClipboardText', () => {
  it('returns the clipboard text', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { readText: vi.fn().mockResolvedValue('pasted') },
      configurable: true,
    });
    await expect(readClipboardText()).resolves.toBe('pasted');
  });

  it('wraps failures as ToolError', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { readText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    await expect(readClipboardText()).rejects.toMatchObject({
      code: 'UNKNOWN',
      message: 'Could not read from clipboard',
    });
  });
});
