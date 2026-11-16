import { SegmentedControl, Stack, Text } from '@arshad-shah/cynosure';
import React from 'react';
import { kdfHint } from '../lib/kdf-hint';
import type { KdfChoice } from '../settings';

/** PBKDF2 (default, fast to open anywhere) or Argon2id (memory-hard). */
export const KdfOptions: React.FC<{
  value: KdfChoice;
  onChange(v: KdfChoice): void;
}> = ({ value, onChange }) => (
  <Stack gap="2">
    <Text as="span" size="sm" weight="medium">
      Key derivation
    </Text>
    <SegmentedControl
      label="Key derivation"
      size="sm"
      value={value}
      onChange={(v) => onChange(v as KdfChoice)}
      options={[
        { value: 'pbkdf2', label: 'PBKDF2' },
        { value: 'argon2id', label: 'Argon2id' },
      ]}
    />
    <Text size="sm" tone="muted">
      {kdfHint(value)}
    </Text>
  </Stack>
);
