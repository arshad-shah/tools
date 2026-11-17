import { describe, expect, it } from 'vitest';
import { canRedo, canUndo, historyOf, push, redo, undo } from './history';

describe('history', () => {
  it('undoes and redoes in order', () => {
    let h = historyOf(1);
    h = push(h, 2);
    h = push(h, 3);
    expect(canUndo(h)).toBe(true);
    h = undo(h);
    expect(h.present).toBe(2);
    h = undo(h);
    expect(h.present).toBe(1);
    expect(canUndo(h)).toBe(false);
    expect(undo(h)).toBe(h);
    h = redo(h);
    expect(h.present).toBe(2);
    expect(canRedo(h)).toBe(true);
  });

  it('drops the redo list on a new step and ignores no-op pushes', () => {
    let h = push(push(historyOf('a'), 'b'), 'c');
    h = push(undo(h), 'd');
    expect(canRedo(h)).toBe(false);
    expect(h.past).toEqual(['a', 'b']);
    expect(push(h, 'd')).toBe(h);
    expect(redo(h)).toBe(h);
  });

  it('keeps at most the limit', () => {
    let h = historyOf(0);
    for (let i = 1; i <= 10; i++) h = push(h, i, 3);
    expect(h.past).toEqual([7, 8, 9]);
  });
});
