/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useUndoableText } from './useUndoableText';

describe('useUndoableText', () => {
  it('applies, undoes and redoes', () => {
    const { result } = renderHook(() => useUndoableText('b\na'));
    act(() =>
      result.current.apply(
        (t) => t.split('\n').sort().join('\n'),
        'Sort A to Z',
      ),
    );
    expect(result.current.text).toBe('a\nb');
    expect(result.current.undoLabel).toBe('Sort A to Z');
    act(() => result.current.undo());
    expect(result.current.text).toBe('b\na');
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.redo());
    expect(result.current.text).toBe('a\nb');
    expect(result.current.canRedo).toBe(false);
  });

  it('starts a new branch after an edit and ignores no-op operations', () => {
    const { result } = renderHook(() => useUndoableText('x'));
    act(() => result.current.set('y'));
    act(() => result.current.undo());
    act(() => result.current.set('z'));
    expect(result.current.canRedo).toBe(false);
    act(() => result.current.apply((t) => t, 'Nothing'));
    expect(result.current.undoLabel).toBe('Edit');
  });

  it('drops the oldest step past the limit', () => {
    const { result } = renderHook(() => useUndoableText('0', 3));
    for (const n of ['1', '2', '3', '4']) act(() => result.current.set(n));
    for (let i = 0; i < 5; i++) act(() => result.current.undo());
    expect(result.current.text).toBe('1');
    expect(result.current.canUndo).toBe(false);
  });
});
