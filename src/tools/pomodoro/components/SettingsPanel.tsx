import React from 'react';
import {
  IconBattery,
  IconClock,
  IconCoffee,
  IconPlay,
  IconSettings2,
  IconTimer,
} from '@/shared/ui/icons';
import {
  Badge,
  Card,
  CardBody,
  Heading,
  Inline,
  Label,
  Slider,
  Stack,
  Switch,
  Text,
} from '@/shared/ui';
import { usePomodoroStore } from '../store';
import type { Settings } from '../types';

export const SettingsPanel: React.FC = () => {
  const settings = usePomodoroStore((s) => s.settings);
  const update = (u: Partial<Settings>) =>
    usePomodoroStore.getState().updateSettings(u);

  return (
    <Stack gap="6">
      <Inline align="center" gap="2">
        <IconSettings2 size="lg" />
        <Heading level={3} size="md">
          Settings
        </Heading>
      </Inline>

      <Stack gap="4">
        <Inline align="center" gap="2">
          <IconClock size="md" />
          <Heading level={4} size="sm">
            Timer durations
          </Heading>
        </Inline>

        <Card>
          <CardBody>
            <Stack gap="3">
              <Inline justify="between" align="center" wrap>
                <Inline align="center" gap="2">
                  <IconTimer size="sm" />
                  <Label>Work duration</Label>
                </Inline>
                <Badge variant="soft" tone="accent" size="sm">
                  {settings.workDuration} min
                </Badge>
              </Inline>
              <Slider
                value={settings.workDuration}
                onValueChange={(v) => update({ workDuration: v })}
                min={1}
                max={60}
                step={1}
                aria-label="Work duration"
              />
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stack gap="3">
              <Inline justify="between" align="center" wrap>
                <Inline align="center" gap="2">
                  <IconCoffee size="sm" />
                  <Label>Short break</Label>
                </Inline>
                <Badge variant="soft" tone="info" size="sm">
                  {settings.shortBreakDuration} min
                </Badge>
              </Inline>
              <Slider
                value={settings.shortBreakDuration}
                onValueChange={(v) => update({ shortBreakDuration: v })}
                min={1}
                max={30}
                step={1}
                aria-label="Short break"
              />
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stack gap="3">
              <Inline justify="between" align="center" wrap>
                <Inline align="center" gap="2">
                  <IconBattery size="sm" />
                  <Label>Long break</Label>
                </Inline>
                <Badge variant="soft" tone="success" size="sm">
                  {settings.longBreakDuration} min
                </Badge>
              </Inline>
              <Slider
                value={settings.longBreakDuration}
                onValueChange={(v) => update({ longBreakDuration: v })}
                min={5}
                max={45}
                step={5}
                aria-label="Long break"
              />
            </Stack>
          </CardBody>
        </Card>
      </Stack>

      <Stack gap="4">
        <Inline align="center" gap="2">
          <IconPlay size="md" />
          <Heading level={4} size="sm">
            Automation
          </Heading>
        </Inline>

        <Card>
          <CardBody>
            <Inline justify="between" align="center" gap="3" wrap>
              <Stack gap="1">
                <Label htmlFor="auto-breaks">Auto-start breaks</Label>
                <Text size="xs" tone="subtle">
                  Automatically begin breaks when work sessions end
                </Text>
              </Stack>
              <Switch
                id="auto-breaks"
                checked={settings.autoStartBreaks}
                onCheckedChange={(c) => update({ autoStartBreaks: c })}
              />
            </Inline>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Inline justify="between" align="center" gap="3" wrap>
              <Stack gap="1">
                <Label htmlFor="auto-pomos">Auto-start pomodoros</Label>
                <Text size="xs" tone="subtle">
                  Automatically begin new work sessions after breaks
                </Text>
              </Stack>
              <Switch
                id="auto-pomos"
                checked={settings.autoStartPomodoros}
                onCheckedChange={(c) => update({ autoStartPomodoros: c })}
              />
            </Inline>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Inline justify="between" align="center" gap="3" wrap>
              <Stack gap="1">
                <Label htmlFor="sound">Sound notifications</Label>
                <Text size="xs" tone="subtle">
                  Play a sound when the timer completes
                </Text>
              </Stack>
              <Switch
                id="sound"
                checked={settings.soundEnabled}
                onCheckedChange={(c) => update({ soundEnabled: c })}
              />
            </Inline>
          </CardBody>
        </Card>
      </Stack>
    </Stack>
  );
};
