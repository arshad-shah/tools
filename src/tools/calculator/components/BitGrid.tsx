import {
  Button,
  Inline,
  Stack,
  Text,
  useRovingFocus,
} from '@arshad-shah/cynosure';
import React, { useRef } from 'react';

export interface BitGridProps {
  bits: 8 | 16 | 32 | 64;
  value: bigint;
  /** Called with the bit index (0 is the least significant). */
  onToggle(index: number): void;
  /** Accessible name of the group. */
  label: string;
}

const isSet = (value: bigint, i: number) => ((value >> BigInt(i)) & 1n) === 1n;

/**
 * Bits as toggle buttons, most significant first, one group per byte. One
 * tab stop: arrows move between bits, Home and End jump (Cynosure has no
 * bit field, docs/cynosure-gaps.md).
 */
export const BitGrid: React.FC<BitGridProps> = ({
  bits,
  value,
  onToggle,
  label,
}) => {
  const ref = useRef<HTMLElement>(null);
  useRovingFocus(ref, { orientation: 'both', selector: 'button' });
  const bytes = Array.from({ length: bits / 8 }, (_, b) => bits / 8 - 1 - b);
  return (
    <Inline ref={ref} gap="5" wrap role="group" aria-label={label}>
      {bytes.map((b) => (
        <Stack key={b} gap="1">
          <Inline gap="1">
            {Array.from({ length: 8 }, (_, k) => b * 8 + 7 - k).map((i) => {
              const on = isSet(value, i);
              return (
                <Button
                  key={i}
                  size="sm"
                  square
                  variant={on ? 'solid' : 'outline'}
                  tone={on ? 'accent' : 'neutral'}
                  aria-pressed={on}
                  aria-label={`Bit ${i}, ${on ? 'set' : 'clear'}`}
                  onClick={() => onToggle(i)}
                >
                  {on ? '1' : '0'}
                </Button>
              );
            })}
          </Inline>
          <Text size="xs" tone="muted" numeric>
            {`Bits ${b * 8 + 7} to ${b * 8}`}
          </Text>
        </Stack>
      ))}
    </Inline>
  );
};
