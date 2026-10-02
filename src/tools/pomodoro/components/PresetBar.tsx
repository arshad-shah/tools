import React from 'react';
import { SegmentedControl } from '@/shared/ui';
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
    <SegmentedControl<PresetValue>
      label="Session preset"
      size="sm"
      value={current}
      onChange={(v) => {
        const p = PRESETS.find((x) => x.value === v);
        if (p)
          usePomodoroStore.getState().updateSettings({
            workDuration: p.work,
            shortBreakDuration: p.rest,
          });
      }}
      options={[
        ...PRESETS.map((p) => ({ value: p.value, label: p.label })),
        { value: 'custom', label: 'Custom', disabled: current !== 'custom' },
      ]}
    />
  );
};
