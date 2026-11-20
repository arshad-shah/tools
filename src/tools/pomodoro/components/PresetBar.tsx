import { SegmentedControl } from '@arshad-shah/cynosure';
import React from 'react';
import { usePomodoroStore } from '../store';

const PRESETS = [
  { value: '25-5', label: '25 / 5', work: 25, rest: 5 },
  { value: '50-10', label: '50 / 10', work: 50, rest: 10 },
  { value: '90-20', label: '90 / 20', work: 90, rest: 20 },
] as const;

type PresetValue = (typeof PRESETS)[number]['value'] | 'custom';

/** Work and short-break presets; other durations read as Custom. */
export const PresetBar: React.FC = () => {
  const work = usePomodoroStore((s) => s.settings.workDuration);
  const rest = usePomodoroStore((s) => s.settings.shortBreakDuration);
  const current: PresetValue =
    PRESETS.find((p) => p.work === work && p.rest === rest)?.value ?? 'custom';
  return (
    <SegmentedControl
      label="Session preset"
      size="sm"
      value={current}
      onChange={(v) => {
        const p = PRESETS.find((x) => x.value === (v as PresetValue));
        if (p)
          usePomodoroStore.getState().updateSettings({
            workDuration: p.work,
            shortBreakDuration: p.rest,
          });
      }}
      // Custom is a state, not a choice: it shows only when the durations
      // set in Settings match no preset.
      options={[
        ...PRESETS.map((p) => ({ value: p.value, label: p.label })),
        ...(current === 'custom' ? [{ value: 'custom', label: 'Custom' }] : []),
      ]}
    />
  );
};
