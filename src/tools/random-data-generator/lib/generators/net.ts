import type { Rng } from '@/shared/lib/prng';
import { hex } from './util';

export const ipv4 = (rng: Rng): string =>
  `${1 + rng.int(254)}.${rng.int(256)}.${rng.int(256)}.${1 + rng.int(254)}`;

/** A global unicast IPv6 address (2000::/3), lower-case, not compressed. */
export function ipv6(rng: Rng): string {
  const b = rng.bytes(16);
  b[0] = 0x20 | (b[0] & 0x1f);
  const h = hex(b);
  const groups: string[] = [];
  for (let i = 0; i < 32; i += 4) groups.push(h.slice(i, i + 4));
  return groups.join(':');
}

/** A locally administered unicast MAC address. */
export function mac(rng: Rng): string {
  const b = rng.bytes(6);
  b[0] = (b[0] & 0xfc) | 0x02;
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(':');
}

const TLDS = ['com', 'org', 'net', 'io', 'dev', 'app', 'co'] as const;
const DOMAIN_WORDS = [
  'acme',
  'blue',
  'bright',
  'cloud',
  'data',
  'delta',
  'echo',
  'forge',
  'globe',
  'harbor',
  'nova',
  'orbit',
  'pixel',
  'prime',
  'quartz',
  'river',
  'summit',
  'swift',
  'terra',
  'vector',
] as const;

export const domain = (rng: Rng): string =>
  `${rng.pick(DOMAIN_WORDS)}${rng.pick(DOMAIN_WORDS)}.${rng.pick(TLDS)}`;

export const url = (rng: Rng, path: string): string =>
  `https://www.${domain(rng)}/${path}`;
