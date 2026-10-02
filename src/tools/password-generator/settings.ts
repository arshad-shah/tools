import { createToolSettings } from '@/shared/lib/tool-settings';

export interface PasswordSettings {
  mode: 'password' | 'passphrase' | 'pin';
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  /** Extra characters for the pool (a setting, not a secret). */
  includeChars: string;
  excludeChars: string;
  noLeadingSymbol: boolean;
  minPerClass: number;
  pinLength: number;
  pinNoRepeats: boolean;
  pinNoSequences: boolean;
  words: number;
  separator: string;
  capitalise: 'none' | 'first' | 'all';
  addNumber: boolean;
  addSymbol: boolean;
  bulkCount: number;
}

export const PASSWORD_DEFAULTS: PasswordSettings = {
  mode: 'password',
  length: 20,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
  includeChars: '',
  excludeChars: '',
  noLeadingSymbol: false,
  minPerClass: 1,
  pinLength: 6,
  pinNoRepeats: true,
  pinNoSequences: true,
  words: 6,
  separator: '-',
  capitalise: 'none',
  addNumber: false,
  addSymbol: false,
  bulkCount: 10,
};

/** Every option (spec §8.4); never a generated password. */
export const passwordSettings = createToolSettings<PasswordSettings>(
  'password-generator',
  PASSWORD_DEFAULTS,
  { version: 1 },
);
