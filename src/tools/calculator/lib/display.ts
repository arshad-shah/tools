import type { PendingOperator } from '../types';

/** Thousands separators on the integer part; error text passes through. */
export function formatDisplay(value: string): string {
  if (value.startsWith('Error')) return value; // pass error message as-is

  const floatVal = parseFloat(value);
  if (!isNaN(floatVal)) {
    // If there's a decimal, keep it
    if (value.includes('.')) {
      const [intPart, decimalPart] = value.split('.');
      const parsedInt = parseInt(intPart, 10);
      if (!isNaN(parsedInt)) {
        return `${parsedInt.toLocaleString()}.${decimalPart}`;
      }
      return value;
    }
    // Otherwise, format integer
    return floatVal.toLocaleString();
  }
  // If not parseable as number, return raw
  return value;
}

/**
 * `current <op> operand` for the standard/scientific keypad. Results within
 * 1e-10 of zero snap to 0. An unknown operator yields the operand.
 */
export function applyOperator(
  current: number,
  operand: number,
  op: PendingOperator,
): { value: number } | { error: string } {
  let newValue: number;
  switch (op) {
    case '+':
      newValue = current + operand;
      break;
    case '-':
      newValue = current - operand;
      break;
    case '×':
      newValue = current * operand;
      break;
    case '÷':
      if (operand === 0) return { error: 'Divide by zero' };
      newValue = current / operand;
      break;
    case 'pow':
      newValue = Math.pow(current, operand);
      break;
    case 'mod':
      if (operand === 0) return { error: 'Mod by zero' };
      newValue = current % operand;
      break;
    default:
      newValue = operand;
  }
  if (Math.abs(newValue) < 1e-10) newValue = 0;
  return { value: newValue };
}

/** How an operator reads in the history line (`pow` shows as `^`). */
export function operatorSymbol(op: PendingOperator): PendingOperator {
  return op === 'pow' ? '^' : op === 'mod' ? 'mod' : op;
}

/** The part after ` = ` in a history line, or null if there is not one. */
export function resultOf(calculation: string): string | null {
  const parts = calculation.split(' = ');
  return parts.length === 2 ? parts[1] : null;
}
