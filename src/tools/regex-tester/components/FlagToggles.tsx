import React from 'react';
import { IconSettings } from '@/shared/ui/icons';

import { Button, Inline, Label, Stack } from '@/shared/ui';
import { FLAG_INFO } from '../lib/flags';
import type { Flags } from '../types';

interface FlagTogglesProps {
  flags: Flags;
  onToggle: (key: keyof Flags) => void;
}

export const FlagToggles: React.FC<FlagTogglesProps> = ({
  flags,
  onToggle,
}) => (
  <Stack gap="2">
    <Inline gap="2" align="center">
      <IconSettings size="sm" />
      <Label>Flags</Label>
    </Inline>
    <Inline gap="2" wrap>
      {FLAG_INFO.map((f) => (
        <Button
          key={f.key}
          variant={flags[f.key] ? 'primary' : 'secondary'}
          size="sm"
          title={`${f.label}: ${f.description}`}
          onClick={() => onToggle(f.key)}
        >
          {f.flag}
        </Button>
      ))}
    </Inline>
  </Stack>
);
