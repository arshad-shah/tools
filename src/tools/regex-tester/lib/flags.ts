import type { Flags } from '../types';

export const DEFAULT_FLAGS: Flags = {
  global: true,
  ignoreCase: false,
  multiline: false,
  dotAll: false,
  unicode: false,
  sticky: false,
  hasIndices: false,
};

export const FLAG_INFO: Array<{
  key: keyof Flags;
  flag: string;
  label: string;
  description: string;
}> = [
  {
    key: 'global',
    flag: 'g',
    label: 'Global',
    description: 'Find all matches',
  },
  {
    key: 'ignoreCase',
    flag: 'i',
    label: 'Ignore case',
    description: 'Case insensitive matching',
  },
  {
    key: 'multiline',
    flag: 'm',
    label: 'Multiline',
    description: '^ and $ match line breaks',
  },
  {
    key: 'dotAll',
    flag: 's',
    label: 'Dot all',
    description: '. matches newline characters',
  },
  {
    key: 'unicode',
    flag: 'u',
    label: 'Unicode',
    description: 'Full Unicode matching',
  },
  {
    key: 'sticky',
    flag: 'y',
    label: 'Sticky',
    description: 'Match only from lastIndex position',
  },
  {
    key: 'hasIndices',
    flag: 'd',
    label: 'Indices',
    description: 'Generate start/end indices',
  },
];

/** The flag letters of the enabled flags, in FLAG_INFO order. */
export function flagsString(flags: Flags): string {
  return FLAG_INFO.filter((f) => flags[f.key])
    .map((f) => f.flag)
    .join('');
}

/** Canonical flag order, as `RegExp.prototype.flags` reports it. */
const FLAG_ORDER = 'dgimsuvy';

/** Turns one flag letter on or off; `u` and `v` exclude each other. */
export function toggleFlag(flags: string, letter: string): string {
  const set = new Set(flags);
  if (set.has(letter)) set.delete(letter);
  else {
    set.add(letter);
    if (letter === 'u') set.delete('v');
    if (letter === 'v') set.delete('u');
  }
  return [...FLAG_ORDER].filter((f) => set.has(f)).join('');
}

/** `flags` plus `d`, so matches carry their group spans. */
export const withIndices = (flags: string): string =>
  flags.includes('d') ? flags : toggleFlag(flags, 'd');
