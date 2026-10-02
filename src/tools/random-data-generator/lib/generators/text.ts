import type { Rng } from '@/shared/lib/prng';
import { between } from './util';

export const LOREM_WORDS = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'ut',
  'labore',
  'et',
  'dolore',
  'magna',
  'aliqua',
  'enim',
  'ad',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'aliquip',
  'ex',
  'ea',
  'commodo',
  'consequat',
  'duis',
  'aute',
  'irure',
  'in',
  'reprehenderit',
  'voluptate',
  'velit',
  'esse',
  'cillum',
  'fugiat',
  'nulla',
  'pariatur',
  'excepteur',
  'sint',
  'occaecat',
  'cupidatat',
  'non',
  'proident',
  'sunt',
  'culpa',
  'qui',
  'officia',
  'deserunt',
  'mollit',
  'anim',
  'id',
  'est',
  'laborum',
] as const;

export const word = (rng: Rng): string => rng.pick(LOREM_WORDS);

export function words(rng: Rng, min = 3, max = 6): string {
  const n = between(rng, Math.max(1, min), Math.max(1, max));
  return Array.from({ length: n }, () => word(rng)).join(' ');
}

export function sentence(rng: Rng, min = 6, max = 14): string {
  const s = words(rng, min, max);
  return `${s[0].toUpperCase()}${s.slice(1)}.`;
}

export function paragraph(rng: Rng, min = 3, max = 6): string {
  const n = between(rng, Math.max(1, min), Math.max(1, max));
  return Array.from({ length: n }, () => sentence(rng)).join(' ');
}

export const slug = (rng: Rng): string => words(rng, 2, 4).replace(/ /g, '-');

export const semver = (rng: Rng): string =>
  `${rng.int(10)}.${rng.int(30)}.${rng.int(50)}`;

/** A valid five-field cron expression. */
export function cron(rng: Rng): string {
  const minute = rng.pick(['0', '*/5', '*/15', '30', String(rng.int(60))]);
  const hour = rng.pick(['*', '0', '9', '*/2', String(rng.int(24))]);
  const dom = rng.pick(['*', '1', '15']);
  const month = rng.pick(['*', '*', '1', '6']);
  const dow = rng.pick(['*', '1-5', '0', '6']);
  return `${minute} ${hour} ${dom} ${month} ${dow}`;
}

export const hexColor = (rng: Rng): string =>
  `#${rng.int(0x1000000).toString(16).padStart(6, '0')}`;

const ADJECTIVES = [
  'Ergonomic',
  'Rustic',
  'Sleek',
  'Compact',
  'Durable',
  'Handmade',
  'Lightweight',
  'Modern',
  'Portable',
  'Premium',
  'Smart',
  'Vintage',
] as const;
const MATERIALS = [
  'Cotton',
  'Steel',
  'Wooden',
  'Granite',
  'Bamboo',
  'Leather',
  'Ceramic',
  'Glass',
  'Wool',
  'Aluminium',
] as const;
const PRODUCTS = [
  'Chair',
  'Lamp',
  'Backpack',
  'Keyboard',
  'Mug',
  'Table',
  'Watch',
  'Bottle',
  'Notebook',
  'Speaker',
  'Jacket',
  'Shelf',
] as const;

export const productName = (rng: Rng): string =>
  `${rng.pick(ADJECTIVES)} ${rng.pick(MATERIALS)} ${rng.pick(PRODUCTS)}`;
