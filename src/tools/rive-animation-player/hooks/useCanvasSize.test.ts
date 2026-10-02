/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCanvasSize } from './useCanvasSize';

describe('useCanvasSize', () => {
  it('follows every resize, including back to the starting size', () => {
    let size = { width: 0, height: 0 };
    const preview = document.createElement('div');
    preview.getBoundingClientRect = () =>
      new DOMRect(0, 0, size.width, size.height);
    const { result } = renderHook(() =>
      useCanvasSize({ current: preview }, { current: null }, { current: null }),
    );
    expect(result.current).toEqual({ width: 0, height: 0 });

    size = { width: 320, height: 180 };
    act(() => window.dispatchEvent(new Event('resize')));
    expect(result.current).toEqual({ width: 320, height: 180 });

    size = { width: 0, height: 0 };
    act(() => window.dispatchEvent(new Event('resize')));
    expect(result.current).toEqual({ width: 0, height: 0 });
  });
});
