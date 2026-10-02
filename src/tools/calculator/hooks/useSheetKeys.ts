import { useEffect, useRef } from 'react';
import { keyToAction, type CalcKeyAction } from '../lib/keys';
import type { SheetApi } from './useSheet';

const OPERATOR: Record<string, string> = {
  '+': '+',
  '-': '-',
  '×': '*',
  '÷': '/',
  pow: '^',
};

/** A page key's effect on the sheet. */
export function applyKey(sheet: SheetApi, a: CalcKeyAction): void {
  switch (a.type) {
    case 'digit':
      return sheet.insert(String(a.digit));
    case 'decimal':
      return sheet.insert('.');
    case 'operator':
      return sheet.insert(OPERATOR[a.op]);
    case 'percent':
      return sheet.insert('%');
    case 'equals':
      sheet.evaluateActive();
      return;
    case 'backspace':
      return sheet.backspace();
    case 'clear-entry':
    case 'clear':
      return sheet.clearActive();
  }
}

/**
 * The page key map (P0 keyToAction) drives the sheet while focus is not in
 * an editable target (the lines edit natively). One stable listener reads
 * the latest sheet through a ref.
 */
export function useSheetKeys(sheet: SheetApi, enabled: boolean): void {
  const latest = useRef({ sheet, enabled });
  useEffect(() => {
    latest.current = { sheet, enabled };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!latest.current.enabled || e.defaultPrevented) return;
      const action = keyToAction(e);
      if (!action) return;
      e.preventDefault();
      applyKey(latest.current.sheet, action);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
