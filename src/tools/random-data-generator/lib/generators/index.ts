import {
  CARD_NETWORKS,
  IBAN_COUNTRIES,
  type MockField,
  type MockFieldType,
} from '@/shared/lib/data-formats/mock-schema';
import { ToolError } from '@/shared/lib/errors';
import type { Rng } from '@/shared/lib/prng';
import { identiconSvgDataUri } from '../identicon';
import type { LocaleData } from '../locales';
import { generateFromPattern } from '../pattern';
import { CURRENCY_CODES, iban, luhnCard } from './finance';
import { nanoid, uuidV4 } from './ids';
import { domain, ipv4, ipv6, mac, url } from './net';
import * as people from './people';
import { COUNTRIES } from './places';
import * as text from './text';
import { between, decimal, fromAlphabet } from './util';

export interface GenContext {
  rng: Rng;
  locale: LocaleData;
  /** 0-based row of the table being generated. */
  row: number;
}

export type Generator = (field: MockField, ctx: GenContext) => unknown;

/** Default bounds for dates (fixed, so a seed gives the same data later). */
export const DEFAULT_DATE_FROM = '2000-01-01';
export const DEFAULT_DATE_TO = '2025-12-31';

function dateRange(field: MockField): [number, number] {
  const from = Date.parse(field.dateFrom ?? DEFAULT_DATE_FROM);
  const to = Date.parse(field.dateTo ?? DEFAULT_DATE_TO);
  if (Number.isNaN(from) || Number.isNaN(to))
    throw new ToolError(
      'INVALID_INPUT',
      `${field.name}: the date range is not valid`,
    );
  return from <= to ? [from, to] : [to, from];
}

const instant = (field: MockField, { rng }: GenContext) => {
  const [from, to] = dateRange(field);
  return from + Math.floor(rng.next() * (to - from + 1));
};

function weightedEnum(field: MockField, rng: Rng): unknown {
  const choices = field.enum ?? [];
  const total = choices.reduce((s, c) => s + c.weight, 0);
  if (choices.length === 0 || !(total > 0))
    throw new ToolError(
      'INVALID_INPUT',
      `Add at least one value with a weight above 0 to ${field.name}`,
    );
  let r = rng.next() * total;
  for (const c of choices) {
    r -= c.weight;
    if (r < 0) return c.value;
  }
  return choices[choices.length - 1].value;
}

const LOWER = 'abcdefghijklmnopqrstuvwxyz';

/** Leaf generators; object, array and foreign-key are handled by the engine. */
export const GENERATORS: Record<
  Exclude<MockFieldType, 'object' | 'array' | 'foreign-key'>,
  Generator
> = {
  string: (f, { rng }) =>
    fromAlphabet(rng, LOWER, between(rng, f.min ?? 5, f.max ?? 10)),
  int: (f, { rng }) => between(rng, f.min ?? 0, f.max ?? 1000),
  number: (f, { rng }) =>
    f.precision
      ? decimal(rng, f.min ?? 0, f.max ?? 100, f.precision)
      : between(rng, f.min ?? 0, f.max ?? 100),
  float: (f, { rng }) =>
    decimal(rng, f.min ?? 0, f.max ?? 1000, f.precision ?? 2),
  boolean: (_, { rng }) => rng.int(2) === 1,
  enum: (f, { rng }) => weightedEnum(f, rng),
  pattern: (f, { rng }) => generateFromPattern(f.pattern ?? '', rng),
  uuid: (_, { rng }) => uuidV4(rng),
  nanoid: (_, { rng }) => nanoid(rng),
  sequence: (f, { row }) => (f.min ?? 1) + row,
  firstName: (_, { rng, locale }) => people.firstName(rng, locale),
  lastName: (_, { rng, locale }) => people.lastName(rng, locale),
  fullName: (_, { rng, locale }) => people.fullName(rng, locale),
  username: (_, { rng, locale }) => people.username(rng, locale),
  email: (_, { rng, locale }) => people.email(rng, locale),
  phone: (_, { rng, locale }) => people.phone(rng, locale),
  gender: (_, { rng }) => rng.pick(people.GENDERS),
  sex: (_, { rng }) => rng.pick(people.SEXES),
  age: (f, { rng }) => between(rng, f.min ?? 18, f.max ?? 90),
  jobTitle: (_, { rng }) => rng.pick(people.JOB_TITLES),
  company: (_, { rng }) => people.company(rng),
  avatar: (_, { rng }) => identiconSvgDataUri(String(rng.int(2 ** 32))),
  password: (_, { rng }) => people.password(rng),
  address: (_, { rng, locale }) => people.address(rng, locale),
  street: (_, { rng, locale }) => people.street(rng, locale),
  city: (_, { rng, locale }) => people.city(rng, locale),
  zipCode: (_, { rng, locale }) => people.postcode(rng, locale),
  country: (_, { rng }) => rng.pick(COUNTRIES)[0],
  countryCode: (_, { rng }) => rng.pick(COUNTRIES)[1],
  latitude: (_, { rng }) => decimal(rng, -90, 90, 6),
  longitude: (_, { rng }) => decimal(rng, -180, 180, 6),
  date: (f, ctx) => new Date(instant(f, ctx)).toISOString().slice(0, 10),
  dateTime: (f, ctx) => new Date(instant(f, ctx)).toISOString(),
  time: (f, ctx) => new Date(instant(f, ctx)).toISOString().slice(11, 19),
  timestamp: (f, ctx) => Math.floor(instant(f, ctx) / 1000),
  creditCard: (f, { rng }) =>
    luhnCard(rng, f.network ?? rng.pick(CARD_NETWORKS)),
  iban: (f, { rng }) => iban(rng, f.country ?? rng.pick(IBAN_COUNTRIES)),
  currency: (f, { rng }) =>
    decimal(rng, f.min ?? 0, f.max ?? 10_000, f.precision ?? 2).toFixed(
      f.precision ?? 2,
    ),
  currencyCode: (_, { rng }) => rng.pick(CURRENCY_CODES),
  price: (f, { rng }) =>
    decimal(rng, f.min ?? 1, f.max ?? 500, f.precision ?? 2),
  url: (_, { rng }) => url(rng, text.slug(rng)),
  domain: (_, { rng }) => domain(rng),
  ipAddress: (_, { rng }) => ipv4(rng),
  ipv6: (_, { rng }) => ipv6(rng),
  mac: (_, { rng }) => mac(rng),
  word: (_, { rng }) => text.word(rng),
  words: (f, { rng }) => text.words(rng, f.min ?? 3, f.max ?? 6),
  sentence: (f, { rng }) => text.sentence(rng, f.min ?? 6, f.max ?? 14),
  paragraph: (f, { rng }) => text.paragraph(rng, f.min ?? 3, f.max ?? 6),
  slug: (_, { rng }) => text.slug(rng),
  color: (_, { rng }) => text.hexColor(rng),
  semver: (_, { rng }) => text.semver(rng),
  cron: (_, { rng }) => text.cron(rng),
  productName: (_, { rng }) => text.productName(rng),
};
