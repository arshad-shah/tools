import { ToolError } from '@/shared/lib/errors';
import { bitOp, parseInBase } from '@/shared/lib/numbers';

export interface ProgrammerOptions {
  bits: 8 | 16 | 32 | 64;
  signed: boolean;
  /** The base unprefixed numbers are read in. */
  base: 2 | 8 | 10 | 16;
}

type Token =
  | { t: 'num'; v: bigint; at: number }
  | { t: 'op'; v: string; at: number }
  | { t: 'fn'; v: string; at: number };

const FUNCTIONS = new Set(['rotl', 'rotr', 'nand', 'nor']);
const OPERATORS = [
  '>>>',
  '<<',
  '>>',
  '&',
  '|',
  '^',
  '~',
  '+',
  '-',
  '*',
  '/',
  '%',
  '(',
  ')',
  ',',
];

const invalid = (message: string) => new ToolError('INVALID_INPUT', message);

function tokenize(expr: string, base: number): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9a-z_]/i.test(ch)) {
      let j = i;
      while (j < expr.length && /[0-9a-z_]/i.test(expr[j])) j++;
      const word = expr.slice(i, j);
      if (FUNCTIONS.has(word.toLowerCase()) && /^\s*\(/.test(expr.slice(j))) {
        out.push({ t: 'fn', v: word.toLowerCase(), at: i });
      } else {
        const prefix = /^0[xbo]/i.exec(word)?.[0].toLowerCase();
        const b =
          prefix === '0x'
            ? 16
            : prefix === '0b'
              ? 2
              : prefix === '0o'
                ? 8
                : base;
        let v: bigint;
        try {
          v = parseInBase(word, b).value;
        } catch (e) {
          if (/^[a-z_]\w*$/i.test(word) && /^\s*\(/.test(expr.slice(j)))
            throw invalid(`Unknown function "${word}"`);
          const m = /at position (\d+)/.exec((e as Error).message);
          throw invalid(
            m
              ? `Digit ${word[Number(m[1]) - 1]} is not valid in base ${b} at position ${i + Number(m[1])}`
              : (e as Error).message,
          );
        }
        out.push({ t: 'num', v, at: i });
      }
      i = j;
      continue;
    }
    const op = OPERATORS.find((o) => expr.startsWith(o, i));
    if (!op) throw invalid(`Unexpected "${ch}" at position ${i + 1}`);
    out.push({ t: 'op', v: op, at: i });
    i += op.length;
  }
  return out;
}

// Binary operators by precedence, loosest first (C order).
const LEVELS = [
  ['|'],
  ['^'],
  ['&'],
  ['<<', '>>', '>>>'],
  ['+', '-'],
  ['*', '/', '%'],
];

/**
 * Evaluates a programmer-mode expression on `bits`-wide words (spec §8.5).
 * Numbers are in `base` unless prefixed (`0x`, `0b`, `0o`); operators are
 * `& | ^ ~ << >> >>> + - * / %` with C precedence; functions are
 * `rotl(a, n)`, `rotr(a, n)`, `nand(a, b)` and `nor(a, b)`. Every step wraps
 * to the word, read back signed or unsigned. `>>` is arithmetic on signed
 * words and logical on unsigned ones; `>>>` is always logical.
 */
export function programmerEval(
  expr: string,
  { bits, signed, base }: ProgrammerOptions,
): bigint {
  const tokens = tokenize(expr, base);
  if (tokens.length === 0) throw invalid('Enter an expression');
  let pos = 0;
  const wrap = (v: bigint) =>
    signed ? BigInt.asIntN(bits, v) : BigInt.asUintN(bits, v);
  const peek = () => tokens[pos];
  const isOp = (v: string) => peek()?.t === 'op' && peek().v === v;
  const expect = (v: string) => {
    if (!isOp(v)) {
      const tok = peek();
      throw invalid(
        tok ? `Expected "${v}" at position ${tok.at + 1}` : `Missing "${v}"`,
      );
    }
    pos++;
  };

  const binary = (op: string, a: bigint, b: bigint): bigint => {
    switch (op) {
      case '|':
        return bitOp('or', a, b, bits, signed);
      case '^':
        return bitOp('xor', a, b, bits, signed);
      case '&':
        return bitOp('and', a, b, bits, signed);
      case '<<':
        return bitOp('shl', a, b, bits, signed);
      case '>>':
        return bitOp(signed ? 'sar' : 'shr', a, b, bits, signed);
      case '>>>':
        return bitOp('shr', a, b, bits, signed);
      case '+':
        return wrap(a + b);
      case '-':
        return wrap(a - b);
      case '*':
        return wrap(a * b);
      default:
        if (b === 0n) throw invalid('Division by zero');
        return wrap(op === '/' ? a / b : a % b);
    }
  };

  const parseLevel = (level: number): bigint => {
    if (level === LEVELS.length) return parseUnary();
    let left = parseLevel(level + 1);
    for (;;) {
      const tok = peek();
      if (tok?.t !== 'op' || !LEVELS[level].includes(tok.v)) break;
      pos++;
      left = binary(tok.v, left, parseLevel(level + 1));
    }
    return left;
  };

  const parseUnary = (): bigint => {
    if (isOp('~')) {
      pos++;
      return bitOp('not', parseUnary(), 0n, bits, signed);
    }
    if (isOp('-')) {
      pos++;
      return wrap(-parseUnary());
    }
    if (isOp('+')) {
      pos++;
      return parseUnary();
    }
    return parsePrimary();
  };

  const parsePrimary = (): bigint => {
    const tok = peek();
    if (!tok) throw invalid('The expression ends too early');
    if (tok.t === 'num') {
      pos++;
      return wrap(tok.v);
    }
    if (tok.t === 'fn') {
      pos++;
      expect('(');
      const a = parseLevel(0);
      expect(',');
      const b = parseLevel(0);
      expect(')');
      const op = tok.v as 'rotl' | 'rotr' | 'nand' | 'nor';
      return bitOp(op, a, b, bits, signed);
    }
    if (tok.v === '(') {
      pos++;
      const v = parseLevel(0);
      expect(')');
      return v;
    }
    throw invalid(`Unexpected "${tok.v}" at position ${tok.at + 1}`);
  };

  const result = parseLevel(0);
  if (pos < tokens.length)
    throw invalid(`Unexpected input at position ${tokens[pos].at + 1}`);
  return result;
}
