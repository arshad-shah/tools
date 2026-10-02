export const CALCULATOR_SHARE_VERSION = 1;

export interface CalculatorShare {
  lines: string[];
  angle: 'deg' | 'rad';
  precision: number;
}

const MAX_LINES = 500;
const MAX_LINE = 2000;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** The shared-link validator (spec §4.2): the sheet, angle and precision. */
export function parseCalculatorShare(state: unknown): CalculatorShare | null {
  if (!isObject(state)) return null;
  const { lines, angle, precision } = state;
  if (
    !Array.isArray(lines) ||
    lines.length === 0 ||
    lines.length > MAX_LINES ||
    !lines.every((l) => typeof l === 'string' && l.length <= MAX_LINE)
  )
    return null;
  if (angle !== 'deg' && angle !== 'rad') return null;
  if (
    typeof precision !== 'number' ||
    !Number.isInteger(precision) ||
    precision < 4 ||
    precision > 64
  )
    return null;
  return { lines: lines as string[], angle, precision };
}
