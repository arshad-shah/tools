import React from 'react';
import {
  Clock,
  Flame,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
} from 'lucide-react';
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
              <Icon size={28} aria-hidden />
              <Heading level={2} size="xl">
                {info.label}
              </Heading>
              {timer.mode === 'work' && dailyPomodoros > 0 && (
                <Badge
                  variant="soft"
                  tone="warning"
                  size="sm"
                  icon={<Flame size={14} aria-hidden />}
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
              <Clock size={14} aria-hidden />
              <Text size="sm" tone="subtle">
                {Math.floor(timer.timeLeft / 60)} minutes remaining
              </Text>
            </Inline>

            <Box className="w-full">
              <Progress value={progress} max={100} />
            </Box>

            {progress >= 100 && (
              <Inline align="center" gap="2">
                <Sparkles size={16} aria-hidden />
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
                  timer.isActive ? <Pause size={20} /> : <Play size={20} />
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
                icon={<RotateCcw size={20} />}
                onClick={() => usePomodoroStore.getState().resetTimer()}
              />
              <IconButton
                variant="soft"
                size="lg"
                label="Skip"
                icon={<SkipForward size={20} />}
                onClick={skip}
              />
            </Inline>
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
};
