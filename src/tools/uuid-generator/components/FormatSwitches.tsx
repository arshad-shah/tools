import React from 'react';
import { Inline, SwitchField } from '@/shared/ui';
import type { UuidFormat } from '../lib/uuid';

const OPTIONS: { key: keyof UuidFormat; label: string }[] = [
  { key: 'upper', label: 'Uppercase' },
  { key: 'hyphens', label: 'Hyphens' },
  { key: 'braces', label: 'Braces' },
  { key: 'urn', label: 'URN prefix' },
];

export const FormatSwitches: React.FC<{
  format: UuidFormat;
  onChange(f: UuidFormat & { [key: string]: boolean }): void;
}> = ({ format, onChange }) => (
  <Inline gap="4" wrap>
    {OPTIONS.map((o) => (
      <SwitchField
        key={o.key}
        id={`uuid-${o.key}`}
        label={o.label}
        checked={format[o.key]}
        onCheckedChange={(v) => onChange({ ...format, [o.key]: v })}
      />
    ))}
  </Inline>
);
