import React from 'react';
import { Button, Grid, Stack } from '@/shared/ui';
import { KeyBackspace } from '@/shared/ui/icons';

/** What a key does: insert text, or one of the sheet's commands. */
export type KeyEffect =
  | { insert: string }
  | { command: 'evaluate' | 'clear' | 'backspace' };

export interface KeyDef {
  /** The key face. */
  face: string;
  /** Accessible name, when the face is a symbol. */
  name?: string;
  effect: KeyEffect;
  tone?: 'operator' | 'equals' | 'clear';
}

const ins = (face: string, insert = face, name?: string): KeyDef => ({
  face,
  name,
  effect: { insert },
  tone: undefined,
});
const op = (face: string, insert: string, name: string): KeyDef => ({
  face,
  name,
  effect: { insert },
  tone: 'operator',
});

const TIMES = String.fromCodePoint(0xd7);
const DIVIDE = String.fromCodePoint(0xf7);
const MINUS = String.fromCodePoint(0x2212);
const PI = String.fromCodePoint(0x3c0);
const ROOT = String.fromCodePoint(0x221a);
const SQUARED = `x${String.fromCodePoint(0xb2)}`;

/** Display symbols map to expression syntax: the multiply key types `*`. */
const STANDARD_KEYS: KeyDef[] = [
  {
    face: 'C',
    name: 'Clear line',
    effect: { command: 'clear' },
    tone: 'clear',
  },
  ins('('),
  ins(')'),
  op(DIVIDE, '/', 'Divide'),
  ins('7'),
  ins('8'),
  ins('9'),
  op(TIMES, '*', 'Multiply'),
  ins('4'),
  ins('5'),
  ins('6'),
  op(MINUS, '-', 'Subtract'),
  ins('1'),
  ins('2'),
  ins('3'),
  op('+', '+', 'Add'),
  ins('0'),
  ins('.', '.', 'Decimal point'),
  op('%', '%', 'Percent'),
  {
    face: '=',
    name: 'Equals',
    effect: { command: 'evaluate' },
    tone: 'equals',
  },
  op('^', '^', 'Power'),
  ins('ans', 'ans', 'Previous answer'),
  ins('to', ' to ', 'Convert units'),
  { face: '', name: 'Backspace', effect: { command: 'backspace' } },
];

const SCIENTIFIC_KEYS: KeyDef[] = [
  ins('sin', 'sin('),
  ins('cos', 'cos('),
  ins('tan', 'tan('),
  ins(PI, 'pi', 'Pi'),
  ins('asin', 'asin('),
  ins('acos', 'acos('),
  ins('atan', 'atan('),
  ins('e', 'e', 'Euler number'),
  ins('ln', 'log(', 'Natural log'),
  ins('log', 'log10(', 'Log base 10'),
  ins(ROOT, 'sqrt(', 'Square root'),
  ins(SQUARED, '^2', 'Square'),
  ins('n!', '!', 'Factorial'),
  ins('abs', 'abs(', 'Absolute value'),
  ins('1/x', '1/', 'Reciprocal'),
  ins('mod', ' mod ', 'Modulo'),
];

interface KeypadProps {
  scientific: boolean;
  onKey(effect: KeyEffect): void;
}

const VARIANT = {
  operator: 'secondary',
  equals: 'primary',
  clear: 'danger',
} as const;

const KeyGrid: React.FC<{
  keys: KeyDef[];
  onKey(effect: KeyEffect): void;
  label: string;
}> = ({ keys, onKey, label }) => (
  <Grid cols={4} gap="2" role="group" aria-label={label}>
    {keys.map((k) => (
      <Button
        key={k.name ?? k.face}
        type="button"
        size="lg"
        fullWidth
        variant={k.tone ? VARIANT[k.tone] : 'ghost'}
        aria-label={k.name}
        leftIcon={
          'command' in k.effect && k.effect.command === 'backspace' ? (
            <KeyBackspace size="sm" />
          ) : undefined
        }
        className={
          k.tone === 'operator' ? 'text-accent-fg' : 'border border-line'
        }
        onClick={() => onKey(k.effect)}
      >
        {k.face}
      </Button>
    ))}
  </Grid>
);

/**
 * Standard keys (and the scientific functions above them) that insert
 * tokens into the active line; `=` records it and `C` clears it.
 */
export const Keypad: React.FC<KeypadProps> = ({ scientific, onKey }) => (
  <Stack gap="3">
    {scientific && (
      <KeyGrid keys={SCIENTIFIC_KEYS} onKey={onKey} label="Scientific keys" />
    )}
    <KeyGrid keys={STANDARD_KEYS} onKey={onKey} label="Keypad" />
  </Stack>
);
