import type { Rng } from '@/shared/lib/prng';
import type { LocaleData } from '../locales';
import { between, fillFormat, fromAlphabet } from './util';

export const firstName = (rng: Rng, l: LocaleData): string =>
  rng.pick(l.firstNames);
export const lastName = (rng: Rng, l: LocaleData): string =>
  rng.pick(l.lastNames);
export const fullName = (rng: Rng, l: LocaleData): string =>
  `${firstName(rng, l)} ${lastName(rng, l)}`;

/** Lower-case ASCII for user names and email local parts. */
const ascii = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[^A-Za-z]/g, '')
    .toLowerCase();

export function username(rng: Rng, l: LocaleData): string {
  const first = ascii(firstName(rng, l));
  const last = ascii(lastName(rng, l));
  switch (rng.int(3)) {
    case 0:
      return `${first}${rng.int(1000)}`;
    case 1:
      return `${first}.${last}`;
    default:
      return `${first[0]}${last}${rng.int(100)}`;
  }
}

export function email(rng: Rng, l: LocaleData): string {
  const first = ascii(firstName(rng, l));
  const last = ascii(lastName(rng, l));
  const local =
    rng.int(2) === 0 ? `${first}.${last}` : `${first}${rng.int(1000)}`;
  return `${local}@${rng.pick(l.domains)}`;
}

export const phone = (rng: Rng, l: LocaleData): string =>
  fillFormat(rng, rng.pick(l.phoneFormats));

export const GENDERS = [
  'Female',
  'Male',
  'Non-binary',
  'Genderfluid',
  'Prefer not to say',
] as const;
export const SEXES = ['Female', 'Male', 'Intersex'] as const;

export const JOB_TITLES = [
  'Software Engineer',
  'Product Manager',
  'Data Scientist',
  'Designer',
  'Marketing Specialist',
  'Support Engineer',
  'HR Manager',
  'Sales Executive',
  'Financial Analyst',
  'Operations Director',
  'Accountant',
  'Teacher',
  'Nurse',
  'Architect',
  'Consultant',
  'Researcher',
] as const;

const COMPANY_WORDS = [
  'Acme',
  'Apex',
  'Blue',
  'Cedar',
  'Delta',
  'Evergreen',
  'Globex',
  'Harbor',
  'Initech',
  'Nimbus',
  'Northwind',
  'Orion',
  'Pinnacle',
  'Quantum',
  'Summit',
  'Vertex',
] as const;
const COMPANY_SUFFIXES = [
  'Inc.',
  'Ltd',
  'Group',
  'Labs',
  'Systems',
  'Partners',
  'Holdings',
  'Co.',
] as const;

export const company = (rng: Rng): string =>
  `${rng.pick(COMPANY_WORDS)} ${rng.pick(COMPANY_SUFFIXES)}`;

const PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';

export const password = (rng: Rng): string =>
  fromAlphabet(rng, PASSWORD_ALPHABET, between(rng, 12, 20));

export function street(rng: Rng, l: LocaleData): string {
  const n = between(rng, 1, l.numberFirst ? 9999 : 200);
  const name = rng.pick(l.streets);
  return l.numberFirst ? `${n} ${name}` : `${name} ${n}`;
}

export const city = (rng: Rng, l: LocaleData): string => rng.pick(l.cities);

export const postcode = (rng: Rng, l: LocaleData): string =>
  fillFormat(rng, rng.pick(l.postcodeFormats));

export const address = (rng: Rng, l: LocaleData): string =>
  `${street(rng, l)}, ${postcode(rng, l)} ${city(rng, l)}`;
