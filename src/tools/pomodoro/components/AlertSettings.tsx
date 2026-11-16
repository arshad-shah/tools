import {
  Button,
  Grid,
  Notice,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure';
import { play } from '@arshad-shah/cynosure/icons';
import React, { useState } from 'react';
import { logToolError, toToolError } from '@/shared/lib/errors';
import { usePomodoroStore } from '../store';
import { SOUND_URLS } from '../hooks/useTimerWorker';
import {
  notificationPermission,
  requestNotifications,
  type NotifyPermission,
} from '../lib/notify';
import type { Settings, SoundId } from '../types';

const SOUNDS: { value: SoundId; label: string }[] = [
  { value: 'chime', label: 'Chime' },
  { value: 'bell', label: 'Bell' },
  { value: 'wood', label: 'Wood block' },
];

/** Notifications, sound choice and volume, and the tab-icon ring. */
export const AlertSettings: React.FC = () => {
  const settings = usePomodoroStore((s) => s.settings);
  const update = (u: Partial<Settings>) =>
    usePomodoroStore.getState().updateSettings(u);
  const [permission, setPermission] = useState<NotifyPermission>(
    notificationPermission,
  );

  const toggleNotifications = async (on: boolean) => {
    if (!on) {
      update({ notifications: false });
      return;
    }
    const p =
      permission === 'granted' ? permission : await requestNotifications();
    setPermission(p);
    update({ notifications: p === 'granted' });
  };

  const preview = () => {
    try {
      const audio = new Audio(SOUND_URLS[settings.sound]);
      audio.volume = settings.volume / 100;
      audio
        .play()
        .catch((e: unknown) =>
          logToolError(toToolError(e, 'Could not play the sound')),
        );
    } catch (e) {
      logToolError(toToolError(e, 'Could not play the sound'));
    }
  };

  return (
    <Stack gap="5">
      <Switch
        label="System notifications"
        description="Notify when a session ends while this tab is in the background"
        checked={settings.notifications && permission === 'granted'}
        disabled={permission === 'unsupported'}
        onChange={(c) => void toggleNotifications(c)}
      />
      {permission === 'denied' ? (
        <Notice tone="warning">
          Notifications are blocked for this site. Allow them in your
          browser&apos;s site settings, then turn this on again.
        </Notice>
      ) : null}
      {permission === 'unsupported' ? (
        <Text size="sm" tone="muted">
          This browser does not support notifications.
        </Text>
      ) : null}
      <Grid columns="minmax(0, 1fr) auto" gap="2" align="end">
        <Select
          label="Completion sound"
          value={settings.sound}
          onChange={(v) => update({ sound: v as SoundId })}
          options={SOUNDS}
        />
        <Button variant="soft" icon={play} onClick={preview}>
          Preview
        </Button>
      </Grid>
      <Slider
        label="Volume"
        showValue
        labels={{ value: (v) => `${v}%` }}
        value={settings.volume}
        onChange={(v) => update({ volume: v as number })}
        min={0}
        max={100}
        step={5}
      />
      <Switch
        label="Progress in the tab icon"
        description="Draw the running session as a ring in the browser tab"
        checked={settings.faviconRing}
        onChange={(c) => update({ faviconRing: c })}
      />
    </Stack>
  );
};
