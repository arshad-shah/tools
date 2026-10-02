import React from 'react';
import { Inline, Label, Switch } from '@/shared/ui';
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
      <Inline key={o.key} gap="2" align="center">
        <Switch
          id={`uuid-${o.key}`}
          checked={format[o.key]}
          onCheckedChange={(v) => onChange({ ...format, [o.key]: v })}
          aria-label={o.label}
        />
        <Label htmlFor={`uuid-${o.key}`}>{o.label}</Label>
      </Inline>
    ))}
  </Inline>
);
