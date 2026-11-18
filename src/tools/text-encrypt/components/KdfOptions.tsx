import {
  Badge,
  Disclosure,
  SegmentedControl,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import React from 'react';
import { kdfHint } from '../lib/kdf-hint';
import type { KdfChoice } from '../settings';

const KDF_OPTIONS: { value: KdfChoice; label: string }[] = [
  { value: 'pbkdf2', label: 'PBKDF2' },
  { value: 'argon2id', label: 'Argon2id' },
];

/**
 * PBKDF2 (default, fast to open anywhere) or Argon2id (memory-hard),
 * behind a closed disclosure that names the current choice.
 */
export const KdfOptions: React.FC<{
  value: KdfChoice;
  onChange(v: KdfChoice): void;
}> = ({ value, onChange }) => (
  <Disclosure
    summary="Key derivation"
    variant="line"
    size="sm"
    trailing={
      <Badge tone="neutral" size="sm">
        {KDF_OPTIONS.find((o) => o.value === value)?.label}
      </Badge>
    }
  >
    <Stack gap="2">
      <SegmentedControl
        label="Key derivation"
        value={value}
        onChange={(v) => onChange(v as KdfChoice)}
        options={KDF_OPTIONS}
      />
      <Text size="sm" tone="muted">
        {kdfHint(value)}
      </Text>
    </Stack>
  </Disclosure>
);
