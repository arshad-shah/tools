export const NUMBER_SHARE_VERSION = 1;

export interface NumberShare {
  /** The value in decimal (BigInt text, may be negative). */
  value: string;
  bits: 8 | 16 | 32 | 64;
  signed: boolean;
  customBase: number;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** The shared-link validator (spec §4.2): value, width and signedness. */
export function parseNumberShare(state: unknown): NumberShare | null {
  if (!isObject(state)) return null;
  const { value, bits, signed, customBase } = state;
  if (typeof value !== 'string' || !/^-?\d{1,200}$/.test(value)) return null;
  if (bits !== 8 && bits !== 16 && bits !== 32 && bits !== 64) return null;
  if (typeof signed !== 'boolean') return null;
  if (
    typeof customBase !== 'number' ||
    !Number.isInteger(customBase) ||
    customBase < 2 ||
    customBase > 36
  )
    return null;
  return { value, bits, signed, customBase };
}
