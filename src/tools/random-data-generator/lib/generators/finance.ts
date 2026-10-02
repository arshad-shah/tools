import type {
  CardNetwork,
  IbanCountry,
} from '@/shared/lib/data-formats/mock-schema';
import type { Rng } from '@/shared/lib/prng';
import { digits, fillFormat } from './util';

/** True when the digits pass the Luhn (mod 10) check. */
export function luhnValid(number: string): boolean {
  if (!/^\d+$/.test(number)) return false;
  let sum = 0;
  for (let i = 0; i < number.length; i++) {
    let d = number.charCodeAt(number.length - 1 - i) - 48;
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** The digit that makes `partial` + digit pass the Luhn check. */
export function luhnCheckDigit(partial: string): string {
  for (let d = 0; d < 10; d++) if (luhnValid(partial + d)) return String(d);
  throw new Error('unreachable');
}

const CARDS: Record<
  CardNetwork,
  { prefixes: readonly string[]; length: number }
> = {
  visa: { prefixes: ['4'], length: 16 },
  mastercard: {
    prefixes: ['51', '52', '53', '54', '55', '2221', '2500', '2720'],
    length: 16,
  },
  amex: { prefixes: ['34', '37'], length: 15 },
  discover: { prefixes: ['6011', '644', '645', '649', '65'], length: 16 },
};

/** A Luhn-valid test card number with the network's prefix and length. */
export function luhnCard(rng: Rng, network: CardNetwork): string {
  const { prefixes, length } = CARDS[network];
  const prefix = rng.pick(prefixes);
  const body = prefix + digits(rng, length - prefix.length - 1);
  return body + luhnCheckDigit(body);
}

/** The remainder of a long digit string mod 97 (no BigInt needed). */
function mod97(numeric: string): number {
  let r = 0;
  for (let i = 0; i < numeric.length; i += 7)
    r = Number(String(r) + numeric.slice(i, i + 7)) % 97;
  return r;
}

/** Letters to numbers (A = 10 ... Z = 35), as ISO 13616 requires. */
const toNumeric = (s: string) =>
  s.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

/** True when the IBAN's mod-97 remainder is 1 (ISO 13616). */
export function ibanValid(iban: string): boolean {
  const s = iban.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s)) return false;
  return mod97(toNumeric(s.slice(4) + s.slice(0, 4))) === 1;
}

/** French RIB key over bank, branch and account digits. */
function ribKey(bank: string, branch: string, account: string): string {
  const key =
    97 - ((89 * Number(bank) + 15 * Number(branch) + 3 * mod97(account)) % 97);
  return String(key).padStart(2, '0');
}

/** Spanish CCC control digit over 10 digits (weights 1, 2, 4, 8, 5, 10...). */
function cccDigit(ten: string): string {
  const w = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6];
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(ten[i]) * w[i];
  const d = 11 - (sum % 11);
  return String(d === 11 ? 0 : d === 10 ? 1 : d);
}

function bban(rng: Rng, country: IbanCountry): string {
  switch (country) {
    case 'GB':
    case 'IE':
      // Bank code (4 letters), sort code (6), account (8).
      return fillFormat(rng, 'AAAA##############');
    case 'DE':
      // Bank code (8), account (10).
      return digits(rng, 18);
    case 'FR': {
      const bank = digits(rng, 5);
      const branch = digits(rng, 5);
      const account = digits(rng, 11);
      return bank + branch + account + ribKey(bank, branch, account);
    }
    case 'ES': {
      const bank = digits(rng, 4);
      const branch = digits(rng, 4);
      const account = digits(rng, 10);
      const control = cccDigit(`00${bank}${branch}`) + cccDigit(account);
      return bank + branch + control + account;
    }
  }
}

/** An IBAN with valid check digits (and national check digits for FR, ES). */
export function iban(rng: Rng, country: IbanCountry): string {
  const b = bban(rng, country);
  const check = 98 - mod97(toNumeric(`${b}${country}00`));
  return `${country}${String(check).padStart(2, '0')}${b}`;
}

export const CURRENCY_CODES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CHF',
  'CAD',
  'AUD',
  'CNY',
  'INR',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'BRL',
  'MXN',
  'ZAR',
  'SGD',
  'HKD',
  'NZD',
  'KRW',
] as const;
