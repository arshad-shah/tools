/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useHeldValue } from './use-held-value';

describe('useHeldValue', () => {
  it('follows the value, holding it while a pointer is down', () => {
    const { result, rerender } = renderHook(({ v }) => useHeldValue(v), {
      initialProps: { v: false },
    });
    rerender({ v: true });
    expect(result.current).toBe(true);
    rerender({ v: false });
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    rerender({ v: true });
    expect(result.current).toBe(false);
    act(() => {
      window.dispatchEvent(new Event('pointerup'));
    });
    expect(result.current).toBe(true);
  });
});
