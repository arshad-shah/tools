import React from 'react';
import { Inline, SegmentedControl, Text } from '@/shared/ui';
import type { KdfChoice } from '../settings';

/** PBKDF2 (default, fast to open anywhere) or Argon2id (memory-hard). */
export const KdfOptions: React.FC<{
  value: KdfChoice;
  onChange(v: KdfChoice): void;
}> = ({ value, onChange }) => (
  <Inline gap="2" align="center" wrap={false}>
    <Text as="span" size="sm" tone="muted" aria-hidden>
      Key derivation
    </Text>
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
  </Inline>
);
