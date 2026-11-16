import {
  Checkbox,
  DescriptionList,
  Heading,
  Stack,
  Table,
  Text,
  VisuallyHidden,
} from '@arshad-shah/cynosure';
import React from 'react';
import type { FloatParts } from '@/shared/lib/numbers';

interface ReadoutsProps {
  /** Hex bytes, most significant first, space separated ('' when none). */
  bytesBE: string;
  ascii: string[];
  utf8: string | null;
  float?: FloatParts;
  bits: number;
  /** Symbolic permissions, when the value is 7777 octal or less. */
  perms?: string;
  /** The pattern (0 when there is no value). */
  pattern: bigint;
  hasValue: boolean;
  onToggleBit(index: number): void;
}

const KIND: Record<FloatParts['kind'], string> = {
  normal: 'Normal',
  subnormal: 'Subnormal',
  zero: 'Zero',
  inf: 'Infinity',
  nan: 'Not a number (NaN)',
};

const WHO = [
  { name: 'Owner', shift: 6 },
  { name: 'Group', shift: 3 },
  { name: 'Others', shift: 0 },
] as const;
const WHAT = [
  { name: 'read', bit: 2 },
  { name: 'write', bit: 1 },
  { name: 'execute', bit: 0 },
] as const;

const isSet = (v: bigint, i: number) => ((v >> BigInt(i)) & 1n) === 1n;

const code = (v: string) => (
  <Text as="span" variant="code">
    {v}
  </Text>
);

const Characters: React.FC<Pick<ReadoutsProps, 'bytesBE' | 'ascii'>> = ({
  bytesBE,
  ascii,
}) => {
  const rows = (bytesBE ? bytesBE.split(' ') : []).map((hex, i) => ({
    id: String(i),
    n: i + 1,
    hex,
    ascii: ascii[i] ?? '',
  }));
  return (
    <Table
      caption="Bytes as characters"
      captionHidden
      size="sm"
      rows={rows}
      getRowId={(r) => r.id}
      columns={[
        { key: 'n', header: 'Byte', cell: (r) => r.n },
        { key: 'hex', header: 'Hex', cell: (r) => code(r.hex) },
        { key: 'ascii', header: 'ASCII', cell: (r) => code(r.ascii) },
      ]}
    />
  );
};

const Float: React.FC<{ float?: FloatParts; bits: number }> = ({
  float,
  bits,
}) => {
  if (!float)
    return (
      <Text size="sm" tone="muted">
        {bits === 32 || bits === 64
          ? 'None'
          : 'Choose 32 or 64 bits to read the pattern as an IEEE-754 float.'}
      </Text>
    );
  return (
    <DescriptionList
      size="sm"
      layout="inline"
      items={[
        { id: 'value', term: 'Value', detail: code(String(float.value)) },
        { id: 'kind', term: 'Kind', detail: KIND[float.kind] },
        {
          id: 'sign',
          term: 'Sign',
          detail: float.sign ? '1 (negative)' : '0 (positive)',
        },
        {
          id: 'exp',
          term: 'Exponent',
          detail: `${float.exponent} biased (${float.exponentBits} bits), ${float.unbiased} unbiased`,
        },
        {
          id: 'mantissa',
          term: 'Mantissa',
          detail: code(
            `0x${float.mantissa.toString(16).toUpperCase()} (${float.mantissaBits} bits)`,
          ),
        },
      ]}
    />
  );
};

const Permissions: React.FC<
  Pick<ReadoutsProps, 'perms' | 'pattern' | 'onToggleBit'>
> = ({ perms, pattern, onToggleBit }) => (
  <Stack gap="3">
    <DescriptionList
      size="sm"
      items={[{ id: 'sym', term: 'Symbolic', detail: code(perms ?? 'None') }]}
    />
    {!perms ? (
      <Text size="sm" tone="muted">
        Permissions need a value of 7777 octal or less.
      </Text>
    ) : null}
    <Table
      caption="Unix permissions"
      captionHidden
      size="sm"
      rows={WHO.map((w) => ({ ...w }))}
      getRowId={(r) => r.name}
      columns={[
        { key: 'who', header: 'Who', rowHeader: true, cell: (r) => r.name },
        ...WHAT.map((w) => ({
          key: w.name,
          header: w.name[0].toUpperCase() + w.name.slice(1),
          cell: (r: (typeof WHO)[number]) => {
            const bit = r.shift + w.bit;
            return (
              <Checkbox
                label={<VisuallyHidden>{`${r.name} ${w.name}`}</VisuallyHidden>}
                checked={!!perms && isSet(pattern, bit)}
                disabled={!perms}
                onChange={() => onToggleBit(bit)}
              />
            );
          },
        })),
      ]}
    />
  </Stack>
);

/** Characters, the float decomposition and Unix permissions of the value. */
export const Readouts: React.FC<ReadoutsProps> = (p) => (
  <Stack gap="6">
    <Stack gap="3">
      <Heading level={3} size="sm">
        Characters
      </Heading>
      {p.hasValue ? (
        <>
          <Characters bytesBE={p.bytesBE} ascii={p.ascii} />
          <DescriptionList
            size="sm"
            items={[
              {
                id: 'utf8',
                term: 'UTF-8 text',
                detail:
                  p.utf8 === null
                    ? 'Not valid UTF-8'
                    : p.utf8 === ''
                      ? 'None'
                      : code(p.utf8),
              },
            ]}
          />
        </>
      ) : (
        <Text size="sm" tone="muted">
          None
        </Text>
      )}
    </Stack>
    <Stack gap="3">
      <Heading level={3} size="sm">
        IEEE-754 float
      </Heading>
      <Float float={p.hasValue ? p.float : undefined} bits={p.bits} />
    </Stack>
    <Stack gap="3">
      <Heading level={3} size="sm">
        Unix permissions
      </Heading>
      <Permissions
        perms={p.hasValue ? p.perms : '---------'}
        pattern={p.pattern}
        onToggleBit={p.onToggleBit}
      />
    </Stack>
  </Stack>
);
