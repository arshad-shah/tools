export type RedactPreset = 'email' | 'phone' | 'iban' | 'card';

/** Luhn checksum over the digits of `digits` (other characters ignored). */
export function luhn(digits: string): boolean {
  const d = digits.replace(/\D/g, '');
  if (d.length < 2) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = d.charCodeAt(d.length - 1 - i) - 48;
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

/** ISO 13616 mod-97 check (spaces ignored). */
export function ibanValid(s: string): boolean {
  const v = s.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v)) return false;
  const moved = v.slice(4) + v.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const n = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const digit of n) rem = (rem * 10 + Number(digit)) % 97;
  }
  return rem === 1;
}

const digitCount = (s: string) => s.replace(/\D/g, '').length;

export const PRESETS: Record<
  RedactPreset,
  { label: string; pattern: RegExp; check?: (s: string) => boolean }
> = {
  email: {
    label: 'Email addresses',
    pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  },
  phone: {
    label: 'Phone numbers',
    // Not inside a longer word (IBANs); at most 15 digits (E.164), so card numbers are not phones.
    pattern: /(?<![A-Za-z0-9])(?:\+?\d[\d ()-]{7,}\d)(?![A-Za-z0-9])/g,
    check: (s) => digitCount(s) >= 9 && digitCount(s) <= 15,
  },
  iban: {
    label: 'IBANs',
    pattern: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}\b/g,
    check: ibanValid,
  },
  card: {
    label: 'Card numbers',
    pattern: /\b(?:\d[ -]?){13,19}\b/g,
    check: (s) => {
      const n = digitCount(s);
      return n >= 13 && n <= 19 && luhn(s);
    },
  },
};
