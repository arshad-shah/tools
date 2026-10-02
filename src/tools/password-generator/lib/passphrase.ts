import { ToolError } from '@/shared/lib/errors';
import { pick, randomInt } from '@/shared/lib/crypto/random';
import { DIGITS } from './generate';

export interface PassphraseOptions {
  /** 3 to 12. */
  words: number;
  separator: string;
  /** 'first': capitalise each word's first letter; 'all': upper case. */
  capitalise: 'none' | 'first' | 'all';
  /** Append a random digit to one random word. */
  addNumber: boolean;
  /** Append a random symbol to one random word. */
  addSymbol: boolean;
}

export const MIN_WORDS = 3;
export const MAX_WORDS = 12;
/** Symbols for addSymbol: unambiguous and easy to type. */
export const PASSPHRASE_SYMBOLS = '!@#$%&*?+=';

/** The EFF large wordlist (7,776 words), a lazy chunk on first use. */
export const loadEffWordlist = async (): Promise<readonly string[]> =>
  (await import('../data/eff-large.json')).default;

const shape = (w: string, c: PassphraseOptions['capitalise']) =>
  c === 'all'
    ? w.toUpperCase()
    : c === 'first'
      ? w[0].toUpperCase() + w.slice(1)
      : w;

/** Words chosen uniformly (crypto/random) from `list`, joined. */
export function generatePassphrase(
  opts: PassphraseOptions,
  list: readonly string[],
): string {
  if (
    !Number.isInteger(opts.words) ||
    opts.words < MIN_WORDS ||
    opts.words > MAX_WORDS
  )
    throw new ToolError(
      'INVALID_INPUT',
      `Choose ${MIN_WORDS} to ${MAX_WORDS} words`,
    );
  if (list.length < 2)
    throw new ToolError('INVALID_INPUT', 'The word list is empty');
  const words = Array.from({ length: opts.words }, () =>
    shape(pick(list), opts.capitalise),
  );
  if (opts.addNumber) words[randomInt(words.length)] += pick([...DIGITS]);
  if (opts.addSymbol)
    words[randomInt(words.length)] += pick([...PASSPHRASE_SYMBOLS]);
  return words.join(opts.separator);
}

/**
 * Entropy of the passphrase in bits: log2(listSize^words), plus the digit
 * or symbol and the word it lands on when those are added.
 */
export function passphraseEntropy(
  words: number,
  listSize: number,
  extras: Pick<PassphraseOptions, 'addNumber' | 'addSymbol'> = {
    addNumber: false,
    addSymbol: false,
  },
): number {
  let bits = words * Math.log2(listSize);
  if (extras.addNumber) bits += Math.log2(10 * words);
  if (extras.addSymbol) bits += Math.log2(PASSPHRASE_SYMBOLS.length * words);
  return bits;
}

export const MAX_BULK = 1000;

/** `count` values (1 to 1,000) from `make`. */
export function generateBulk(count: number, make: () => string): string[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_BULK)
    throw new ToolError(
      'INVALID_INPUT',
      `Choose 1 to ${MAX_BULK.toLocaleString('en')} values`,
    );
  return Array.from({ length: count }, make);
}
