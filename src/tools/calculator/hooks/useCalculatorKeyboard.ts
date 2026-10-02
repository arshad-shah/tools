import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Mode, PendingOperator } from '../types';
import { keyToAction, type CalcKeyAction } from '../lib/keys';

export interface CalculatorKeyHandlers {
  inputDigit(digit: number): void;
  inputDecimal(): void;
  performOperation(op: PendingOperator): void;
  calculate(): void;
  backspace(): void;
  clearEntry(): void;
  clear(): void;
  percentage(): void;
}

function dispatch(h: CalculatorKeyHandlers, a: CalcKeyAction) {
  switch (a.type) {
    case 'digit':
      return h.inputDigit(a.digit);
    case 'decimal':
      return h.inputDecimal();
    case 'operator':
      return h.performOperation(a.op);
    case 'equals':
      return h.calculate();
    case 'backspace':
      return h.backspace();
    case 'clear-entry':
      return h.clearEntry();
    case 'clear':
      return h.clear();
    case 'percent':
      return h.percentage();
  }
}

/**
 * The page-level key map. One stable listener; the latest handlers are read
 * through a ref so it never acts on stale state. Expression mode is typed in
 * its own text box, so the listener stands aside there.
 */
export function useCalculatorKeyboard(
  mode: Mode,
  handlers: CalculatorKeyHandlers,
): void {
  const handlersRef = useRef(handlers);
  const modeRef = useRef<Mode>(mode);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (modeRef.current === 'expression') return;
      const action = keyToAction(event);
      if (!action) return;
      event.preventDefault();
      dispatch(handlersRef.current, action);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Latest state for the listener, assigned in a layout effect after every
  // render so a key pressed before paint already sees it.
  useLayoutEffect(() => {
    modeRef.current = mode;
    handlersRef.current = handlers;
  });
}
