/** @vitest-environment jsdom */
import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Mode } from '../types';
import {
  useCalculatorKeyboard,
  type CalculatorKeyHandlers,
} from './useCalculatorKeyboard';

const makeHandlers = (): CalculatorKeyHandlers => ({
  inputDigit: vi.fn(),
  inputDecimal: vi.fn(),
  performOperation: vi.fn(),
  calculate: vi.fn(),
  backspace: vi.fn(),
  clearEntry: vi.fn(),
  clear: vi.fn(),
  percentage: vi.fn(),
});

const keydownCalls = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.filter(([type]) => type === 'keydown').length;

function setup(initialMode: Mode = 'standard') {
  const first = makeHandlers();
  const view = renderHook(
    ({ mode, handlers }: { mode: Mode; handlers: CalculatorKeyHandlers }) =>
      useCalculatorKeyboard(mode, handlers),
    { initialProps: { mode: initialMode, handlers: first } },
  );
  return { first, ...view };
}

describe('useCalculatorKeyboard', () => {
  it('adds one keydown listener and keeps it across re-renders', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const { rerender, unmount } = setup();
    rerender({ mode: 'standard', handlers: makeHandlers() });
    rerender({ mode: 'scientific', handlers: makeHandlers() });

    expect(keydownCalls(add)).toBe(1);
    expect(keydownCalls(remove)).toBe(0);
    unmount();
    expect(keydownCalls(remove)).toBe(1);
  });

  it('dispatches to the latest handlers, not the first ones', () => {
    const { first, rerender } = setup();
    const latest = makeHandlers();
    rerender({ mode: 'standard', handlers: latest });

    fireEvent.keyDown(document, { key: '7' });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(latest.inputDigit).toHaveBeenCalledWith(7);
    expect(latest.calculate).toHaveBeenCalledTimes(1);
    expect(first.inputDigit).not.toHaveBeenCalled();
    expect(first.calculate).not.toHaveBeenCalled();
  });

  it('stands aside in Expression mode and resumes after leaving it', () => {
    const { first, rerender } = setup();
    rerender({ mode: 'expression', handlers: first });
    const ignored = fireEvent.keyDown(document, { key: '3' });
    expect(first.inputDigit).not.toHaveBeenCalled();
    expect(ignored).toBe(true); // default not prevented

    rerender({ mode: 'standard', handlers: first });
    const handled = fireEvent.keyDown(document, { key: '3' });
    expect(first.inputDigit).toHaveBeenCalledWith(3);
    expect(handled).toBe(false); // default prevented
  });
});
