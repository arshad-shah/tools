import React from 'react';
import { Button, Grid } from '@/shared/ui';
import type { TimerMode } from '../types';
import { MODE_INFO } from '../lib/modes';

export const ModeSelector: React.FC<{
  currentMode: TimerMode;
  onChange: (mode: TimerMode) => void;
}> = ({ currentMode, onChange }) => (
  <Grid max={3} gap="2">
    {(Object.keys(MODE_INFO) as TimerMode[]).map((mode) => {
      const info = MODE_INFO[mode];
      const Icon = info.icon;
      const isActive = currentMode === mode;
      return (
        <Button
          key={mode}
          variant={isActive ? 'solid' : 'soft'}
          size="md"
          leftIcon={<Icon size={16} />}
          onClick={() => onChange(mode)}
          fullWidth
        >
          {info.label}
        </Button>
      );
    })}
  </Grid>
);
