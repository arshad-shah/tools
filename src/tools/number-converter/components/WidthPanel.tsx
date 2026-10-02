import React from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  BitGrid,
  Inline,
  MetaList,
  SegmentedControl,
  Stack,
  Text,
} from '@/shared/ui';
import type { NumberSettings } from '../settings';

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

/** Word size, signedness, the overflow warning, bytes and the bit grid. */
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
  <Stack gap="4">
    <Inline gap="4" align="center">
      <SegmentedControl
        label="Word size"
        value={String(bits)}
        onChange={(v) => onBits(Number(v) as Bits)}
        options={WIDTHS.map((w) => ({ value: String(w), label: `${w}-bit` }))}
      />
      <SegmentedControl
        label="Signedness"
        value={signed ? 'signed' : 'unsigned'}
        onChange={(v) => onSigned(v === 'signed')}
        options={[
          { value: 'unsigned', label: 'Unsigned' },
          { value: 'signed', label: 'Signed' },
        ]}
      />
    </Inline>
    {overflow && (
      <Alert status="warning">
        <AlertTitle>Overflow</AlertTitle>
        <AlertDescription>
          The value does not fit in {bits} bits, signed or unsigned. The fields
          show its low {bits} bits only.
        </AlertDescription>
      </Alert>
    )}
    <BitGrid
      bits={bits}
      value={pattern}
      onToggle={onToggleBit}
      label={`Bits of the ${bits}-bit pattern`}
    />
    <MetaList
      items={[
        <Text key="be" as="span" size="sm">
          Big-endian bytes:{' '}
          <Text as="span" mono>
            {bytesBE || 'None'}
          </Text>
        </Text>,
        <Text key="le" as="span" size="sm">
          Little-endian bytes:{' '}
          <Text as="span" mono>
            {bytesLE || 'None'}
          </Text>
        </Text>,
      ]}
    />
  </Stack>
);
