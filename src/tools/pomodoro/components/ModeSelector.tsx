import { SegmentedControl } from '@arshad-shah/cynosure';
import React from 'react';
import { useMediaQuery } from '@/shared/lib/media-query';
import { MODE_INFO } from '../lib/modes';
import type { TimerMode } from '../types';

const OPTIONS = (Object.keys(MODE_INFO) as TimerMode[]).map((mode) => ({
  value: mode,
  label: MODE_INFO[mode].label,
  icon: MODE_INFO[mode].icon,
}));

/** The timer mode: a selection, so a segmented control, never primary buttons. */
export const ModeSelector: React.FC<{
  currentMode: TimerMode;
  onChange: (mode: TimerMode) => void;
}> = ({ currentMode, onChange }) => {
  // Phones: the labels alone, so the three modes fit one row.
  const narrow = useMediaQuery('(max-width: 30rem)');
  return (
    <SegmentedControl
      label="Timer mode"
      fullWidth
      value={currentMode}
      onChange={(v) => onChange(v as TimerMode)}
      options={
        narrow ? OPTIONS.map(({ value, label }) => ({ value, label })) : OPTIONS
      }
    />
  );
};
