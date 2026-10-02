import { ToolError } from '@/shared/lib/errors';
import { fromTwos, toTwos } from './twos';

export type BitOperator =
  | 'and'
  | 'or'
  | 'xor'
  | 'nand'
  | 'nor'
  | 'not'
  | 'shl'
  | 'shr'
  | 'sar'
  | 'rotl'
  | 'rotr';

/**
 * A bitwise operation on `bits`-wide words. Operands are taken as their
 * two's-complement patterns; the result is read back signed or unsigned.
 * `shr` is logical (zero fill) and `sar` arithmetic (sign fill); rotations
 * take the count modulo the word size. `not` ignores `b`.
 */
export function bitOp(
  op: BitOperator,
  a: bigint,
  b: bigint,
  bits: number,
  signed: boolean,
): bigint {
  const w = BigInt(bits);
  const mask = (1n << w) - 1n;
  const x = toTwos(a, bits);
  const y = toTwos(b, bits);
  const count = () => {
    if (b < 0n)
      throw new ToolError('INVALID_INPUT', 'A shift count cannot be negative');
    return b;
  };
  let r: bigint;
  switch (op) {
    case 'and':
      r = x & y;
      break;
    case 'or':
      r = x | y;
      break;
    case 'xor':
      r = x ^ y;
      break;
    case 'nand':
      r = ~(x & y);
      break;
    case 'nor':
      r = ~(x | y);
      break;
    case 'not':
      r = ~x;
      break;
    case 'shl':
      r = count() >= w ? 0n : x << count();
      break;
    case 'shr':
      r = count() >= w ? 0n : x >> count();
      break;
    case 'sar': {
      const n = count() >= w ? w - 1n : count();
      r = fromTwos(x, bits) >> n;
      break;
    }
    case 'rotl':
    case 'rotr': {
      let n = ((b % w) + w) % w;
      if (op === 'rotr') n = (w - n) % w;
      r = (x << n) | (x >> ((w - n) % w));
      if (n === 0n) r = x;
      break;
    }
  }
  r &= mask;
  return signed ? fromTwos(r, bits) : r;
}

const TRIPLE = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];

const invalid = (message: string) => new ToolError('INVALID_INPUT', message);

/**
 * Octal mode to symbolic: `'750'` gives `'rwxr-x---'`. A fourth leading
 * digit sets setuid (s), setgid (s) and sticky (t), upper case when the
 * matching execute bit is off.
 */
export function unixPermissions(octal: string): string {
  const t = octal.trim();
  if (!/^[0-7]{3,4}$/.test(t))
    throw invalid('Permissions are three or four octal digits, such as 755');
  const special = t.length === 4 ? Number(t[0]) : 0;
  const triples = t
    .slice(-3)
    .split('')
    .map((d) => TRIPLE[Number(d)].split(''));
  const mark = (who: number, bit: number, ch: string) => {
    if (!(special & bit)) return;
    const x = triples[who][2] === 'x';
    triples[who][2] = x ? ch : ch.toUpperCase();
  };
  mark(0, 4, 's');
  mark(1, 2, 's');
  mark(2, 1, 't');
  return triples.map((p) => p.join('')).join('');
}

/** Symbolic mode (`'rwxr-x---'`) to octal; a fourth digit only if needed. */
export function permissionsToOctal(symbolic: string): string {
  const t = symbolic.trim();
  if (!/^([r-][w-][xsStT-]){3}$/.test(t))
    throw invalid('Permissions are nine characters such as rwxr-x---');
  let special = 0;
  const digits = [0, 1, 2].map((who) => {
    const [r, w, x] = t.slice(who * 3, who * 3 + 3);
    const lower = x.toLowerCase();
    if (lower === 's' && who < 2) special |= who === 0 ? 4 : 2;
    else if (lower === 't' && who === 2) special |= 1;
    else if (lower !== 'x' && x !== '-')
      throw invalid(`"${x}" is not valid in that position`);
    const exec = x === 'x' || x === 's' || x === 't';
    return (r === 'r' ? 4 : 0) + (w === 'w' ? 2 : 0) + (exec ? 1 : 0);
  });
  return `${special ? special : ''}${digits.join('')}`;
}
