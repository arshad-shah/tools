import { createToolSettings } from '@/shared/lib/tool-settings';
import type { KeyKind } from './types';

/** Clock skew choices in seconds (spec §8.3: 0 to 300). */
export const SKEW_OPTIONS = [0, 30, 60, 120, 300] as const;

export interface JwtSettings {
  /** Clock skew in seconds, one of SKEW_OPTIONS. */
  skew: number;
  /** The last key kind chosen for verification; never the key itself. */
  keyKind: KeyKind;
}

export const JWT_DEFAULTS: JwtSettings = { skew: 0, keyKind: 'secret' };

export const jwtSettings = createToolSettings<JwtSettings>(
  'jwt-decode',
  JWT_DEFAULTS,
  { version: 1 },
);
