import React from 'react';
import {
  Checkbox,
  Heading,
  Inline,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@/shared/ui';
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

const Characters: React.FC<Pick<ReadoutsProps, 'bytesBE' | 'ascii'>> = ({
  bytesBE,
  ascii,
}) => {
  const hex = bytesBE ? bytesBE.split(' ') : [];
  return (
    <Table aria-label="Bytes as characters">
      <TableHeader>
        <TableRow>
          <TableHead>Byte</TableHead>
          <TableHead>Hex</TableHead>
          <TableHead>ASCII</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {hex.map((h, i) => (
          <TableRow key={i}>
            <TableCell>{i + 1}</TableCell>
            <TableCell className="font-mono">{h}</TableCell>
            <TableCell className="font-mono">{ascii[i]}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
  const rows: [string, string][] = [
    ['Value', String(float.value)],
    ['Kind', KIND[float.kind]],
    ['Sign', float.sign ? '1 (negative)' : '0 (positive)'],
    [
      'Exponent',
      `${float.exponent} biased (${float.exponentBits} bits), ${float.unbiased} unbiased`,
    ],
    [
      'Mantissa',
      `0x${float.mantissa.toString(16).toUpperCase()} (${float.mantissaBits} bits)`,
    ],
  ];
  return (
    <Table aria-label={`IEEE-754 ${bits}-bit float`}>
      <TableBody>
        {rows.map(([k, v]) => (
          <TableRow key={k}>
            <TableHead>{k}</TableHead>
            <TableCell className="font-mono">{v}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const Permissions: React.FC<
  Pick<ReadoutsProps, 'perms' | 'pattern' | 'onToggleBit'>
> = ({ perms, pattern, onToggleBit }) => (
  <Stack gap="2">
    <Text size="sm">
      Symbolic:{' '}
      <Text as="span" mono>
        {perms ?? 'None'}
      </Text>
    </Text>
    {!perms && (
      <Text size="sm" tone="muted">
        Permissions need a value of 7777 octal or less.
      </Text>
    )}
    <Table aria-label="Unix permissions">
      <TableHeader>
        <TableRow>
          <TableHead>Who</TableHead>
          {WHAT.map((w) => (
            <TableHead key={w.name}>{w.name}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {WHO.map((who) => (
          <TableRow key={who.name}>
            <TableHead>{who.name}</TableHead>
            {WHAT.map((w) => {
              const bit = who.shift + w.bit;
              return (
                <TableCell key={w.name}>
                  <Checkbox
                    aria-label={`${who.name} ${w.name}`}
                    checked={!!perms && isSet(pattern, bit)}
                    disabled={!perms}
                    onCheckedChange={() => onToggleBit(bit)}
                  />
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Stack>
);

/** Characters, the float decomposition and Unix permissions of the value. */
export const Readouts: React.FC<ReadoutsProps> = (p) => (
  <Stack gap="6">
    <Stack gap="2">
      <Heading level={3} size="sm">
        Characters
      </Heading>
      {p.hasValue ? (
        <>
          <Characters bytesBE={p.bytesBE} ascii={p.ascii} />
          <Inline gap="2">
            <Text size="sm">UTF-8 text:</Text>
            <Text size="sm" mono>
              {p.utf8 === null
                ? 'Not valid UTF-8'
                : p.utf8 === ''
                  ? 'None'
                  : p.utf8}
            </Text>
          </Inline>
        </>
      ) : (
        <Text size="sm" tone="muted">
          None
        </Text>
      )}
    </Stack>
    <Stack gap="2">
      <Heading level={3} size="sm">
        IEEE-754 float
      </Heading>
      <Float float={p.hasValue ? p.float : undefined} bits={p.bits} />
    </Stack>
    <Stack gap="2">
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
