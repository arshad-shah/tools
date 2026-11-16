import { Grid, Heading, Slider, Stack, Switch } from '@arshad-shah/cynosure';
import React from 'react';
import { usePomodoroStore } from '../store';
import type { Settings } from '../types';
import { AlertSettings } from './AlertSettings';

const minutes = (v: number) => `${v} min`;
const sessions = (v: number) => `${v} sessions`;

/** Durations, the long-break cycle, automation and alerts. */
export const SettingsPanel: React.FC = () => {
  const settings = usePomodoroStore((s) => s.settings);
  const update = (u: Partial<Settings>) =>
    usePomodoroStore.getState().updateSettings(u);

  return (
    <Stack gap="8">
      <Stack gap="5">
        <Heading level={3} size="sm">
          Timer durations
        </Heading>
        <Grid columns={{ base: 1, md: 2 }} gap="6">
          <Slider
            label="Work duration"
            showValue
            labels={{ value: minutes }}
            value={settings.workDuration}
            onChange={(v) => update({ workDuration: v as number })}
            min={1}
            max={60}
          />
          <Slider
            label="Short break"
            showValue
            labels={{ value: minutes }}
            value={settings.shortBreakDuration}
            onChange={(v) => update({ shortBreakDuration: v as number })}
            min={1}
            max={30}
          />
          <Slider
            label="Long break"
            showValue
            labels={{ value: minutes }}
            value={settings.longBreakDuration}
            onChange={(v) => update({ longBreakDuration: v as number })}
            min={5}
            max={45}
            step={5}
          />
          <Slider
            label="Long break after"
            showValue
            labels={{ value: sessions }}
            value={settings.longBreakEvery}
            onChange={(v) => update({ longBreakEvery: v as number })}
            min={2}
            max={8}
          />
        </Grid>
      </Stack>

      <Stack gap="5">
        <Heading level={3} size="sm">
          Automation
        </Heading>
        <Switch
          label="Auto-start breaks"
          description="Begin breaks when work sessions end"
          checked={settings.autoStartBreaks}
          onChange={(c) => update({ autoStartBreaks: c })}
        />
        <Switch
          label="Auto-start pomodoros"
          description="Begin new work sessions after breaks"
          checked={settings.autoStartPomodoros}
          onChange={(c) => update({ autoStartPomodoros: c })}
        />
        <Switch
          label="Sound notifications"
          description="Play a sound when the timer completes"
          checked={settings.soundEnabled}
          onChange={(c) => update({ soundEnabled: c })}
        />
      </Stack>

      <Stack gap="5">
        <Heading level={3} size="sm">
          Alerts
        </Heading>
        <AlertSettings />
      </Stack>
    </Stack>
  );
};
