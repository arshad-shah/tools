import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BitGrid,
  Button,
  Grid,
  Inline,
  Input,
  Label,
  SegmentedControl,
  Stack,
  Text,
} from '@/shared/ui';
import { IconExternalLink } from '@/shared/ui/icons';
import { toToolError } from '@/shared/lib/errors';
import { sendTo } from '@/shared/lib/handoff';
import {
  formatInBase,
  fromTwos,
  parseInBase,
  toTwos,
  type WordBits,
} from '@/shared/lib/numbers';
import { programmerEval } from '../lib/programmer';

type Base = 16 | 10 | 8 | 2;

interface ProgrammerProps {
  wordBits: number;
  signed: boolean;
  onWordChange(patch: { wordBits?: number; signed?: boolean }): void;
}

const FIELDS: { base: Base; label: string; group: number }[] = [
  { base: 16, label: 'Hexadecimal', group: 4 },
  { base: 10, label: 'Decimal', group: 0 },
  { base: 8, label: 'Octal', group: 3 },
  { base: 2, label: 'Binary', group: 4 },
];

const OPERATORS: { face: string; insert: string; name: string }[] = [
  { face: 'AND', insert: ' & ', name: 'AND' },
  { face: 'OR', insert: ' | ', name: 'OR' },
  { face: 'XOR', insert: ' ^ ', name: 'XOR' },
  { face: 'NOT', insert: '~', name: 'NOT' },
  { face: 'NAND', insert: 'nand(', name: 'NAND' },
  { face: 'NOR', insert: 'nor(', name: 'NOR' },
  { face: '<<', insert: ' << ', name: 'Shift left' },
  { face: '>>', insert: ' >> ', name: 'Shift right' },
  { face: '>>>', insert: ' >>> ', name: 'Logical shift right' },
  { face: 'ROL', insert: 'rotl(', name: 'Rotate left' },
  { face: 'ROR', insert: 'rotr(', name: 'Rotate right' },
  { face: 'MOD', insert: ' % ', name: 'Modulo' },
];

const WORDS: WordBits[] = [8, 16, 32, 64];
const asWord = (n: number): WordBits =>
  (WORDS as number[]).includes(n) ? (n as WordBits) : 32;

/**
 * Programmer mode (spec §8.5): a word of 8 to 64 bits, signed or unsigned.
 * An expression (programmerEval) or any of the four base fields sets the
 * value; hex, octal and binary show and accept the raw bit pattern.
 */
export const Programmer: React.FC<ProgrammerProps> = ({
  wordBits,
  signed,
  onWordChange,
}) => {
  const navigate = useNavigate();
  const bits = asWord(wordBits);
  const [value, setValue] = useState(0n);
  const [expr, setExpr] = useState('');
  const [exprError, setExprError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ base: Base; text: string } | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const fit = (v: bigint, b: number = bits, s: boolean = signed) =>
    s ? fromTwos(toTwos(v, b), b) : toTwos(v, b);
  const current = fit(value);
  const pattern = toTwos(current, bits);

  // The shown value carries over, re-wrapped, to the new word or signedness.
  const changeWord = (patch: { wordBits?: number; signed?: boolean }) => {
    setValue(current);
    onWordChange(patch);
  };

  const show = (base: Base, group: number) =>
    base === 10 ? current.toString() : formatInBase(pattern, base, { group });

  const evaluate = () => {
    try {
      setValue(programmerEval(expr, { bits, signed, base: 10 }));
      setExprError(null);
    } catch (e) {
      setExprError(toToolError(e).message);
    }
  };

  const editField = (base: Base, text: string) => {
    setDraft({ base, text });
    if (text.trim() === '') {
      setFieldError(null);
      return;
    }
    try {
      const { value: v, fraction } = parseInBase(text, base);
      if (fraction !== undefined) throw new Error('Whole numbers only');
      setValue(base === 10 ? fit(v) : fit(toTwos(v, bits)));
      setFieldError(null);
    } catch (e) {
      setFieldError(toToolError(e).message);
    }
  };

  return (
    <Stack gap="4">
      <Inline gap="3" wrap>
        <SegmentedControl
          label="Word size"
          size="sm"
          value={String(bits)}
          onChange={(v) => changeWord({ wordBits: Number(v) })}
          options={WORDS.map((w) => ({ value: String(w), label: `${w}-bit` }))}
        />
        <SegmentedControl
          label="Signedness"
          size="sm"
          value={signed ? 'signed' : 'unsigned'}
          onChange={(v) => changeWord({ signed: v === 'signed' })}
          options={[
            { value: 'signed', label: 'Signed' },
            { value: 'unsigned', label: 'Unsigned' },
          ]}
        />
      </Inline>

      <Stack gap="2">
        <Label htmlFor="programmer-expression">Expression</Label>
        <Inline gap="2" align="start">
          <Stack gap="1" className="min-w-0 flex-1">
            <Input
              id="programmer-expression"
              value={expr}
              onChange={(t) => {
                setExpr(t);
                setExprError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  evaluate();
                }
              }}
              invalid={exprError !== null}
              placeholder="0xFF & 0b1010 << 2"
              className="font-mono"
              spellCheck={false}
            />
            {exprError && (
              <Text size="xs" className="text-danger" role="alert">
                {exprError}
              </Text>
            )}
          </Stack>
          <Button type="button" variant="primary" onClick={evaluate}>
            Evaluate
          </Button>
        </Inline>
        <Grid
          cols={{ base: 4, md: 6 }}
          gap="2"
          role="group"
          aria-label="Operators"
        >
          {OPERATORS.map((o) => (
            <Button
              key={o.face}
              type="button"
              size="sm"
              variant="secondary"
              aria-label={o.name === o.face ? undefined : o.name}
              onClick={() => setExpr((t) => t + o.insert)}
            >
              {o.face}
            </Button>
          ))}
        </Grid>
      </Stack>

      <Grid cols={{ base: 1, md: 2 }} gap="3">
        {FIELDS.map((f) => (
          <Stack gap="1" key={f.base}>
            <Label htmlFor={`programmer-base-${f.base}`}>{f.label}</Label>
            <Input
              id={`programmer-base-${f.base}`}
              value={
                draft?.base === f.base ? draft.text : show(f.base, f.group)
              }
              onChange={(t) => editField(f.base, t)}
              onBlur={() => {
                setDraft(null);
                setFieldError(null);
              }}
              invalid={draft?.base === f.base && fieldError !== null}
              className="font-mono"
              spellCheck={false}
              inputMode={f.base === 2 || f.base === 8 ? 'numeric' : 'text'}
            />
            {draft?.base === f.base && fieldError && (
              <Text size="xs" className="text-danger" role="alert">
                {fieldError}
              </Text>
            )}
          </Stack>
        ))}
      </Grid>

      <BitGrid
        bits={bits}
        value={pattern}
        label={`Bits of the ${bits}-bit word`}
        onToggle={(i) => setValue(fit(pattern ^ (1n << BigInt(i))))}
      />

      <Inline>
        <Button
          type="button"
          variant="secondary"
          leftIcon={<IconExternalLink size="sm" />}
          onClick={() =>
            sendTo(navigate, 'number-converter', {
              kind: 'text',
              mime: 'text/plain',
              text: current.toString(),
              sourceTool: 'calculator',
            })
          }
        >
          Open in Number Base Converter
        </Button>
      </Inline>
    </Stack>
  );
};
