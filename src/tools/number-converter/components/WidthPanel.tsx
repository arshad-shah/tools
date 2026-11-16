import {
  DescriptionList,
  Inline,
  Notice,
  SegmentedControl,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import React from 'react';
import type { NumberSettings } from '../settings';
import { BitGrid } from './BitGrid';

type Bits = NumberSettings['bits'];

interface WidthPanelProps {
  bits: Bits;
  signed: boolean;
  onBits(bits: Bits): void;
  onSigned(signed: boolean): void;
  /** The bit pattern at the width (0 when there is no value). */
  pattern: bigint;
  overflow: boolean;
  bytesBE: string;
  bytesLE: string;
  onToggleBit(index: number): void;
}

const WIDTHS = [8, 16, 32, 64] as const;

const code = (v: string) => (
  <Text as="span" variant="code">
    {v || 'None'}
  </Text>
);

/** Word size, signedness, the overflow warning, the bit grid and bytes. */
export const WidthPanel: React.FC<WidthPanelProps> = ({
  bits,
  signed,
  onBits,
  onSigned,
  pattern,
  overflow,
  bytesBE,
  bytesLE,
  onToggleBit,
}) => (
  <Stack gap="5">
    <Inline gap="3" wrap>
      <SegmentedControl
        label="Word size"
        size="sm"
        value={String(bits)}
        onChange={(v) => onBits(Number(v) as Bits)}
        options={WIDTHS.map((w) => ({ value: String(w), label: `${w}-bit` }))}
      />
      <SegmentedControl
        label="Signedness"
        size="sm"
        value={signed ? 'signed' : 'unsigned'}
        onChange={(v) => onSigned(v === 'signed')}
        options={[
          { value: 'unsigned', label: 'Unsigned' },
          { value: 'signed', label: 'Signed' },
        ]}
      />
    </Inline>
    {overflow ? (
      <Notice tone="warning" title="Overflow">
        {`The value does not fit in ${bits} bits, signed or unsigned. The fields show its low ${bits} bits only.`}
      </Notice>
    ) : null}
    <BitGrid
      bits={bits}
      value={pattern}
      onToggle={onToggleBit}
      label={`Bits of the ${bits}-bit pattern`}
    />
    <DescriptionList
      size="sm"
      divided
      items={[
        { id: 'be', term: 'Big-endian bytes', detail: code(bytesBE) },
        { id: 'le', term: 'Little-endian bytes', detail: code(bytesLE) },
      ]}
    />
  </Stack>
);
