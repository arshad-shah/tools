import { Grid, Switch } from '@arshad-shah/cynosure';
import React from 'react';
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
  <Grid columns={2} gap="3" role="group" aria-label="Format">
    {OPTIONS.map((o) => (
      <Switch
        key={o.key}
        label={o.label}
        checked={format[o.key]}
        onChange={(v) => onChange({ ...format, [o.key]: v })}
      />
    ))}
  </Grid>
);
