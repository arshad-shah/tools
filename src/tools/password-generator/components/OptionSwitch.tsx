import React from 'react';
import { Inline, Label, Switch } from '@/shared/ui';

export const OptionSwitch: React.FC<{
  id: string;
  label: string;
  checked: boolean;
  onChange(v: boolean): void;
}> = ({ id, label, checked, onChange }) => (
  <Inline gap="2" align="center">
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
    />
    <Label htmlFor={id}>{label}</Label>
  </Inline>
);
