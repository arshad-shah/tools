import { ToolError } from '@/shared/lib/errors';
import { randomString } from '@/shared/lib/crypto/random';

export const URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

export const NANOID_PRESETS = [
  { id: 'url', label: 'URL-safe (A-Z a-z 0-9 _ -)', alphabet: URL_ALPHABET },
  {
    id: 'alphanumeric',
    label: 'Letters and digits',
    alphabet: URL_ALPHABET.slice(0, 62),
  },
  {
    id: 'lowercase',
    label: 'Lowercase and digits',
    alphabet: 'abcdefghijklmnopqrstuvwxyz0123456789',
  },
  { id: 'numbers', label: 'Digits', alphabet: '0123456789' },
  { id: 'hex', label: 'Hex', alphabet: '0123456789abcdef' },
  {
    id: 'no-lookalikes',
    label: 'No look-alikes',
    alphabet: '346789ABCDEFGHJKLMNPQRTUVWXYabcdefghijkmnpqrtwxyz',
  },
] as const;

export const NANO_MIN = 2;
export const NANO_MAX = 64;

/** A NanoID: `size` characters drawn uniformly (no modulo bias). */
export function nanoid(alphabet: string = URL_ALPHABET, size = 21): string {
  const chars = [...new Set(alphabet)];
  if (chars.length < 2)
    throw new ToolError(
      'INVALID_INPUT',
      'The alphabet needs at least 2 different characters',
    );
  if (!Number.isInteger(size) || size < NANO_MIN || size > NANO_MAX)
    throw new ToolError(
      'INVALID_INPUT',
      `The length must be ${NANO_MIN} to ${NANO_MAX}`,
    );
  return randomString(chars.join(''), size);
}

const HOUR_UNITS: [number, string][] = [
  [1 / 3600, 'second'],
  [1 / 60, 'minute'],
  [1, 'hour'],
  [24, 'day'],
  [24 * 365.25, 'year'],
];

function words(n: number): string {
  if (n < 1e6) return Math.round(n).toLocaleString('en');
  const scales: [number, string][] = [
    [1e15, 'quadrillion'],
    [1e12, 'trillion'],
    [1e9, 'billion'],
    [1e6, 'million'],
  ];
  for (const [v, name] of scales)
    if (n >= v && n < v * 1000) return `${(n / v).toPrecision(2)} ${name}`;
  return n.toExponential(1).replace('e+', ' x 10^');
}

function duration(hours: number): string {
  let best = HOUR_UNITS[0];
  for (const u of HOUR_UNITS) if (hours >= u[0]) best = u;
  const n = hours / best[0];
  const shown = words(n);
  return `${shown} ${best[1]}${shown === '1' ? '' : 's'}`;
}

/**
 * How long until a 1% chance of any collision, generating `perHour` IDs
 * per hour (the birthday bound n = sqrt(2 N ln(1 / 0.99)) with N the
 * number of possible IDs).
 */
export function nanoidCollision(
  alphabetSize: number,
  size: number,
  perHour: number,
): string {
  const n = Math.sqrt(2 * Math.log(1 / 0.99)) * alphabetSize ** (size / 2);
  return `About a 1% chance of a collision after ${words(n)} IDs (${duration(n / perHour)} at ${perHour.toLocaleString('en')} IDs per hour)`;
}
