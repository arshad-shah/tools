import React from 'react';
import { SegmentedControl } from '@/shared/ui';
import type { TimerMode } from '../types';
import { MODE_INFO } from '../lib/modes';

const OPTIONS = (Object.keys(MODE_INFO) as TimerMode[]).map((mode) => ({
  value: mode,
  label: MODE_INFO[mode].label,
  icon: MODE_INFO[mode].icon,
}));

/** The timer mode: a selection, so a segmented control, never primary buttons. */
export const ModeSelector: React.FC<{
  currentMode: TimerMode;
  onChange: (mode: TimerMode) => void;
}> = ({ currentMode, onChange }) => (
  <SegmentedControl<TimerMode>
    label="Timer mode"
    value={currentMode}
    onChange={onChange}
    options={OPTIONS}
    className="self-center"
  />
);
