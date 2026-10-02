import type { PasswordSettings } from '../settings';
import type { PasswordOptions } from './generate';

/** Generator options from the persisted settings (PIN mode: digits only). */
export function optionsFrom(
  s: PasswordSettings,
  pin: boolean,
): PasswordOptions {
  return {
    length: pin ? s.pinLength : s.length,
    lower: s.lower,
    upper: s.upper,
    digits: s.digits,
    symbols: s.symbols,
    excludeAmbiguous: s.excludeAmbiguous,
    include: s.includeChars,
    exclude: s.excludeChars,
    noLeadingSymbol: s.noLeadingSymbol,
    minPerClass: pin ? 0 : s.minPerClass,
    pin: pin
      ? { noRepeats: s.pinNoRepeats, noSequences: s.pinNoSequences }
      : undefined,
  };
}
