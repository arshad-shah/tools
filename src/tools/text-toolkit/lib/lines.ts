import { shuffle as secureShuffle } from '@/shared/lib/crypto/random';

export type SortMode = 'az' | 'za' | 'natural' | 'length' | 'numeric';

const split = (text: string) => text.split(/\r?\n/);
const join = (lines: string[]) => lines.join('\n');

const natural = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});
const plain = new Intl.Collator(undefined, { sensitivity: 'variant' });

const leadingNumber = (s: string) => {
  const m = /^\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/i.exec(s);
  return m ? Number(m[1]) : NaN;
};

/** Line operations (spec §9.1); each takes and returns the whole text. */
export const lineOps = {
  sort(text: string, mode: SortMode): string {
    const lines = split(text);
    const cmp: Record<SortMode, (a: string, b: string) => number> = {
      az: (a, b) => plain.compare(a, b),
      za: (a, b) => plain.compare(b, a),
      natural: (a, b) => natural.compare(a, b),
      length: (a, b) => a.length - b.length || plain.compare(a, b),
      numeric: (a, b) => {
        const x = leadingNumber(a);
        const y = leadingNumber(b);
        if (Number.isNaN(x) || Number.isNaN(y))
          return Number.isNaN(x)
            ? Number.isNaN(y)
              ? plain.compare(a, b)
              : 1
            : -1;
        return x - y;
      },
    };
    return join([...lines].sort(cmp[mode]));
  },
  dedupe(
    text: string,
    {
      caseInsensitive = false,
      keep = 'first',
    }: { caseInsensitive?: boolean; keep?: 'first' | 'last' } = {},
  ): string {
    const lines = split(text);
    const key = (l: string) => (caseInsensitive ? l.toLocaleLowerCase() : l);
    const order = keep === 'first' ? lines : [...lines].reverse();
    const seen = new Set<string>();
    const out = order.filter((l) => {
      const k = key(l);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return join(keep === 'first' ? out : out.reverse());
  },
  reverse: (text: string) => join(split(text).reverse()),
  /** Cryptographically random order (spec §9.1). */
  shuffle: (text: string) => join(secureShuffle(split(text))),
  trim: (text: string) => join(split(text).map((l) => l.trim())),
  removeEmpty: (text: string) =>
    join(split(text).filter((l) => l.trim() !== '')),
  number(
    text: string,
    { start = 1, sep = '. ' }: { start?: number; sep?: string } = {},
  ) {
    return join(split(text).map((l, i) => `${start + i}${sep}${l}`));
  },
  affix(
    text: string,
    { prefix = '', suffix = '' }: { prefix?: string; suffix?: string },
  ) {
    return join(split(text).map((l) => `${prefix}${l}${suffix}`));
  },
  join: (text: string, sep: string) => split(text).join(sep),
  split: (text: string, sep: string) =>
    sep === '' ? text : join(text.split(sep)),
  /** Keeps lines containing the text or matching the RegExp; `invert` drops them. */
  filter(
    text: string,
    {
      contains,
      regex,
      invert = false,
    }: { contains?: string; regex?: RegExp; invert?: boolean },
  ): string {
    const test = (l: string) => {
      if (regex) {
        regex.lastIndex = 0;
        return regex.test(l);
      }
      return contains === undefined || l.includes(contains);
    };
    return join(split(text).filter((l) => test(l) !== invert));
  },
};
