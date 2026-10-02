import React from 'react';
import {
  IconClock,
  IconFlame,
  IconPause,
  IconPlay,
  IconRotateCcw,
  IconSkipForward,
  IconSparkles,
  IconTarget,
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
  StatusDot,
  Text,
  renderFaviconImage,
  useFavicon,
} from '@/shared/ui';
import { readThemeTokens } from '@/shared/lib/theme-tokens';
import { drawFaviconRing } from '../lib/favicon-ring';
import { PresetBar } from './PresetBar';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { usePomodoroStore } from '../store';
import { useTimerWorker } from '../hooks/useTimerWorker';
import { cyclePosition, durationFor } from '../lib/session';
import { formatTime } from '../lib/time';
import { CurrentTaskCard } from './CurrentTaskCard';
import { FocusView } from './FocusView';
import { ModeSelector } from './ModeSelector';
import { MODE_INFO } from '../lib/modes';

export const TimerCard: React.FC = () => {
  const timer = usePomodoroStore((s) => s.timer);
  const settings = usePomodoroStore((s) => s.settings);
  const dailyPomodoros = usePomodoroStore((s) => s.stats.dailyPomodoros);
  const completedWork = usePomodoroStore((s) => s.timer.completedWork ?? 0);
  const { skip, prime, announcement } = useTimerWorker();
  const [focusOpen, setFocusOpen] = React.useState(false);

  const toggle = () => {
    if (settings.soundEnabled) prime();
    usePomodoroStore.getState().toggle();
  };
  useToolCommands('pomodoro', [
    {
      id: 'toggle',
      label: timer.isActive ? 'Pause timer' : 'Start timer',
      shortcut: 'Space',
      run: () => {
        // Space on a focused control keeps its own meaning (the shortcut
        // layer prevents the native activation, so do it here).
        const el = document.activeElement;
        if (
          el instanceof HTMLElement &&
          el !== document.body &&
          el.matches(
            'button, a[href], [role="button"], [role="switch"], [role="tab"], [role="checkbox"], [role="menuitem"], [role="radio"]',
          )
        ) {
          el.click();
          return;
        }
        toggle();
      },
    },
    { id: 'skip', label: 'Skip session', shortcut: 's', run: skip },
    {
      id: 'reset',
      label: 'Reset timer',
      shortcut: 'r',
      run: () => usePomodoroStore.getState().resetTimer(),
    },
    {
      id: 'focus',
      label: focusOpen ? 'Exit focus view' : 'Focus view',
      shortcut: 'f',
      run: () => setFocusOpen((o) => !o),
    },
  ]);

  const info = MODE_INFO[timer.mode];
  const Icon = info.icon;
  const total = durationFor(timer.mode, settings);
  const progress = ((total - timer.timeLeft) / total) * 100;
  const every = Math.max(1, settings.longBreakEvery || 4);
  const position = cyclePosition(completedWork, settings);

  // Tab-icon progress ring while a session runs (opt-in), in theme colours.
  const ringStep = Math.round(progress);
  const ring = React.useMemo(() => {
    if (!settings.faviconRing || !timer.isActive) return null;
    const t = readThemeTokens(['line-strong', 'accent-indicator']);
    if (!t['line-strong'] || !t['accent-indicator']) return null;
    return (
      drawFaviconRing(
        ringStep / 100,
        {
          track: t['line-strong'],
          fill: t['accent-indicator'],
        },
        renderFaviconImage,
      ) || null
    );
  }, [settings.faviconRing, timer.isActive, ringStep]);
  useFavicon(ring);

  return (
    <Card>
      <CardBody>
        <Stack gap="6">
          <PresetBar />

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

            <Text
              role="timer"
              aria-label="Time left"
              weight="bold"
              className="text-5xl tracking-tight tabular-nums"
            >
              {formatTime(timer.timeLeft)}
            </Text>
            {/* Announces session changes only, never the per-second ticks. */}
            <Text className="sr-only" role="status" aria-live="polite">
              {announcement}
            </Text>

            <Inline align="center" gap="2">
              <IconClock size="sm" />
              <Text size="sm" tone="subtle">
                {Math.floor(timer.timeLeft / 60)} minutes remaining
              </Text>
            </Inline>

            <Box className="w-full">
              <Progress value={progress} max={100} />
            </Box>

            <Inline align="center" gap="2">
              <Inline gap="1" align="center">
                {Array.from({ length: every }, (_, i) => (
                  <StatusDot
                    key={i}
                    decorative
                    tone={i < position ? 'accent' : 'muted'}
                  />
                ))}
              </Inline>
              <Text size="xs" tone="subtle">
                {every - position === 1
                  ? 'Long break after this session'
                  : `Long break after ${every - position} more sessions`}
              </Text>
            </Inline>

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
                // Pause is not destructive: the secondary style (6-H hierarchy).
                variant={timer.isActive ? 'secondary' : 'primary'}
                size="lg"
                leftIcon={
                  timer.isActive ? (
                    <IconPause size="lg" />
                  ) : (
                    <IconPlay size="lg" />
                  )
                }
                onClick={toggle}
              >
                {timer.isActive ? 'Pause' : 'Start'}
              </Button>
              <IconButton
                variant="secondary"
                size="lg"
                label="Reset"
                icon={<IconRotateCcw size="lg" />}
                onClick={() => usePomodoroStore.getState().resetTimer()}
              />
              <IconButton
                variant="secondary"
                size="lg"
                label="Skip"
                icon={<IconSkipForward size="lg" />}
                onClick={skip}
              />
              <Button
                variant="ghost"
                size="lg"
                leftIcon={<IconTarget size="lg" />}
                onClick={() => setFocusOpen(true)}
              >
                Focus view
              </Button>
            </Inline>
          </Stack>
        </Stack>
      </CardBody>
      <FocusView
        open={focusOpen}
        onClose={() => setFocusOpen(false)}
        onToggle={toggle}
      />
    </Card>
  );
};
