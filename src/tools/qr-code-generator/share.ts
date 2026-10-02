import {
  DEFAULT_FIELDS,
  SECRET_TYPES,
  type PayloadFields,
  type PayloadType,
} from './lib/payloads';
import type { EccLevel } from './lib/render';

export const QR_SHARE_VERSION = 1;

export interface QrShareStyle {
  fg: string;
  bg: string;
  ecc: EccLevel;
  margin: boolean;
}

export interface QrShareState<T extends PayloadType = PayloadType> {
  v: 1;
  type: T;
  fields: PayloadFields[T];
  style: QrShareStyle;
}

/** Sharing is off for types with a password field (spec §4.2). */
export const canShareType = (type: PayloadType) => !SECRET_TYPES.has(type);

const HEX = /^#[0-9a-f]{3,8}$/i;
const ECC = new Set(['L', 'M', 'Q', 'H']);

/**
 * Validates a shared QR link. Refuses unknown or password-bearing types;
 * fields are coerced against the type's defaults (unknown keys dropped).
 */
export function parseQrShare(state: unknown): QrShareState | null {
  if (typeof state !== 'object' || state === null) return null;
  const s = state as Record<string, unknown>;
  const type = s.type as PayloadType;
  if (
    s.v !== 1 ||
    typeof type !== 'string' ||
    !Object.hasOwn(DEFAULT_FIELDS, type)
  )
    return null;
  if (!canShareType(type)) return null;
  const raw = (typeof s.fields === 'object' && s.fields) as Record<
    string,
    unknown
  >;
  if (!raw) return null;
  const defaults = DEFAULT_FIELDS[type] as unknown as Record<string, unknown>;
  const fields: Record<string, unknown> = {};
  for (const [k, d] of Object.entries(defaults)) {
    const v = raw[k];
    fields[k] = typeof v === typeof d ? v : d;
  }
  const st = (typeof s.style === 'object' && s.style) as Record<
    string,
    unknown
  >;
  if (!st) return null;
  const style: QrShareStyle = {
    fg: typeof st.fg === 'string' && HEX.test(st.fg) ? st.fg : '#000000',
    bg: typeof st.bg === 'string' && HEX.test(st.bg) ? st.bg : '#FFFFFF',
    ecc:
      typeof st.ecc === 'string' && ECC.has(st.ecc)
        ? (st.ecc as EccLevel)
        : 'M',
    margin: st.margin !== false,
  };
  return {
    v: 1,
    type,
    fields: fields as unknown as PayloadFields[PayloadType],
    style,
  };
}
