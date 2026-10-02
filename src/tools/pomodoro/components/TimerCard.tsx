import React from 'react';
import {
  IconClock,
  IconFlame,
  IconPause,
  IconPlay,
  IconRotateCcw,
  IconSkipForward,
  IconSparkles,
} from '@/shared/ui/icons';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Heading,
  IconButton,
  Inline,
  Progress,
  Stack,
  Text,
} from '@/shared/ui';
import { usePomodoroStore } from '../store';
import { useTimerWorker } from '../hooks/useTimerWorker';
import { durationFor } from '../lib/session';
import { formatTime } from '../lib/time';
import { CurrentTaskCard } from './CurrentTaskCard';
import { ModeSelector } from './ModeSelector';
import { MODE_INFO } from '../lib/modes';

export const TimerCard: React.FC = () => {
  const timer = usePomodoroStore((s) => s.timer);
  const settings = usePomodoroStore((s) => s.settings);
  const dailyPomodoros = usePomodoroStore((s) => s.stats.dailyPomodoros);
  const { skip, prime, announcement } = useTimerWorker();

  const info = MODE_INFO[timer.mode];
  const Icon = info.icon;
  const total = durationFor(timer.mode, settings);
  const progress = ((total - timer.timeLeft) / total) * 100;

  return (
    <Card>
      <CardBody>
        <Stack gap="6">
          <ModeSelector
            currentMode={timer.mode}
            onChange={(mode) => usePomodoroStore.getState().selectMode(mode)}
          />

          {timer.mode === 'work' && <CurrentTaskCard />}

          <Stack gap="6" align="center">
            <Inline align="center" gap="3" wrap justify="center">
              <Icon size="2xl" />
              <Heading level={2} size="xl">
                {info.label}
              </Heading>
              {timer.mode === 'work' && dailyPomodoros > 0 && (
                <Badge
                  variant="soft"
                  tone="warning"
                  size="sm"
                  icon={<IconFlame size="sm" />}
                >
                  {dailyPomodoros} today
                </Badge>
              )}
            </Inline>

            <p
              role="timer"
              aria-label="Time left"
              className="text-5xl font-bold tracking-tight text-fg tabular-nums"
            >
              {formatTime(timer.timeLeft)}
            </p>
            {/* Announces session changes only, never the per-second ticks. */}
            <p className="sr-only" role="status" aria-live="polite">
              {announcement}
            </p>

            <Inline align="center" gap="2">
              <IconClock size="sm" />
              <Text size="sm" tone="subtle">
                {Math.floor(timer.timeLeft / 60)} minutes remaining
              </Text>
            </Inline>

            <Box className="w-full">
              <Progress value={progress} max={100} />
            </Box>

            {progress >= 100 && (
              <Inline align="center" gap="2">
                <IconSparkles size="sm" />
                <Text size="sm" weight="medium">
                  Time&apos;s up!
                </Text>
              </Inline>
            )}

            <Inline gap="3" wrap justify="center">
              <Button
                variant={timer.isActive ? 'danger' : 'solid'}
                size="lg"
                leftIcon={
                  timer.isActive ? (
                    <IconPause size="lg" />
                  ) : (
                    <IconPlay size="lg" />
                  )
                }
                onClick={() => {
                  if (settings.soundEnabled) prime();
                  usePomodoroStore.getState().toggle();
                }}
              >
                {timer.isActive ? 'Pause' : 'Start'}
              </Button>
              <IconButton
                variant="soft"
                size="lg"
                label="Reset"
                icon={<IconRotateCcw size="lg" />}
                onClick={() => usePomodoroStore.getState().resetTimer()}
              />
              <IconButton
                variant="soft"
                size="lg"
                label="Skip"
                icon={<IconSkipForward size="lg" />}
                onClick={skip}
              />
            </Inline>
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
};
