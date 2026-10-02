import React, { useState } from 'react';
import { IconPlay } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  Inline,
  Label,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
} from '@/shared/ui';
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
    <Stack gap="4">
      <Card>
        <CardBody>
          <Stack gap="3">
            <Inline justify="between" align="center" gap="3" wrap>
              <Stack gap="1">
                <Label htmlFor="notify">System notifications</Label>
                <Text size="xs" tone="subtle">
                  Notify when a session ends while this tab is in the background
                </Text>
              </Stack>
              <Switch
                id="notify"
                checked={settings.notifications && permission === 'granted'}
                disabled={permission === 'unsupported'}
                onCheckedChange={(c) => void toggleNotifications(c)}
              />
            </Inline>
            {permission === 'denied' && (
              <Alert status="warning">
                <AlertDescription>
                  Notifications are blocked for this site. Allow them in your
                  browser&apos;s site settings, then turn this on again.
                </AlertDescription>
              </Alert>
            )}
            {permission === 'unsupported' && (
              <Text size="xs" tone="subtle">
                This browser does not support notifications.
              </Text>
            )}
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Stack gap="3">
            <Label htmlFor="sound-choice">Completion sound</Label>
            <Inline gap="2" align="center" wrap={false}>
              <Select
                id="sound-choice"
                value={settings.sound}
                onValueChange={(v) => update({ sound: v as SoundId })}
                items={SOUNDS}
              />
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<IconPlay size="sm" />}
                onClick={preview}
              >
                Preview
              </Button>
            </Inline>
            <Inline justify="between" align="center">
              <Label>Volume</Label>
              <Text size="sm" tone="subtle">
                {settings.volume}%
              </Text>
            </Inline>
            <Slider
              value={settings.volume}
              onValueChange={(v) => update({ volume: v })}
              min={0}
              max={100}
              step={5}
              aria-label="Volume"
            />
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Inline justify="between" align="center" gap="3" wrap>
            <Stack gap="1">
              <Label htmlFor="favicon-ring">Progress in the tab icon</Label>
              <Text size="xs" tone="subtle">
                Draw the running session as a ring in the browser tab
              </Text>
            </Stack>
            <Switch
              id="favicon-ring"
              checked={settings.faviconRing}
              onCheckedChange={(c) => update({ faviconRing: c })}
            />
          </Inline>
        </CardBody>
      </Card>
    </Stack>
  );
};
