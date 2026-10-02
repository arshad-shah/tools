import React from 'react';
import { SegmentedControl, Stack, Text } from '@/shared/ui';
import type { KdfChoice } from '../settings';

/** PBKDF2 (default, fast to open anywhere) or Argon2id (memory-hard). */
export const KdfOptions: React.FC<{
  value: KdfChoice;
  onChange(v: KdfChoice): void;
}> = ({ value, onChange }) => (
  <Stack gap="1">
    <SegmentedControl<KdfChoice>
      label="Key derivation"
      value={value}
      onChange={onChange}
      size="sm"
      options={[
        { value: 'pbkdf2', label: 'PBKDF2' },
        { value: 'argon2id', label: 'Argon2id' },
      ]}
    />
    <Text size="xs" tone="subtle">
      {value === 'pbkdf2'
        ? 'PBKDF2-SHA-256 with 600,000 iterations.'
        : 'Argon2id with 64 MiB of memory and 3 passes; slower, and harder to attack with GPUs.'}{' '}
      Decrypting reads the choice from the data.
    </Text>
  </Stack>
);
