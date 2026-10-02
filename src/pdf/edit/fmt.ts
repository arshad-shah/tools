import { ToolError } from '@/shared/lib/errors';

/**
 * A number as a PDF content-stream operand: at most three decimals, trailing
 * zeros trimmed, never "-0" and never exponent notation (PDF has none).
 * Shared by every hand-written content-stream writer.
 */
export function fmt(n: number): string {
  if (!Number.isFinite(n))
    throw new ToolError('INVALID_INPUT', 'A drawing position is not a number');
  // Beyond 2^53 there are no fractions left; BigInt writes every digit.
  if (Math.abs(n) >= 2 ** 53) return BigInt(Math.round(n)).toString();
  const rounded = Math.round(n * 1000) / 1000;
  if (rounded === 0) return '0'; // also catches -0
  return rounded.toFixed(3).replace(/\.?0+$/, '');
}
