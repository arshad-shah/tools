import {
  Badge,
  Button,
  Card,
  Divider,
  Heading,
  IconButton,
  IconTile,
  Inline,
  ProgressBar,
  Stack,
  Text,
  useCynosureTheme,
  VisuallyHidden,
} from '@arshad-shah/cynosure';
import {
  flame,
  layoutFocus,
  pause,
  play,
  rotateCcw,
  skipForward,
} from '@arshad-shah/cynosure/icons';
import React from 'react';
import { renderFaviconImage, useFavicon } from '@/shared/ui/use-favicon';
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
  const { colors } = useCynosureTheme();
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
  const total = durationFor(timer.mode, settings);
  const progress = ((total - timer.timeLeft) / total) * 100;
  const every = Math.max(1, settings.longBreakEvery || 4);
  const position = cyclePosition(completedWork, settings);

  // Tab-icon progress ring while a session runs (opt-in), in theme colours.
  const ringStep = Math.round(progress);
  const ring = React.useMemo(() => {
    if (!settings.faviconRing || !timer.isActive) return null;
    return (
      drawFaviconRing(
        ringStep / 100,
        { track: colors.line, fill: colors.accent },
        renderFaviconImage,
      ) || null
    );
  }, [settings.faviconRing, timer.isActive, ringStep, colors]);
  useFavicon(ring);

  const left = every - position;
  return (
    <Card as="section" aria-label="Timer">
      <Stack gap="6">
        <Inline justify="between" align="center" gap="3" wrap>
          <PresetBar />
          <Button
            variant="ghost"
            size="sm"
            icon={layoutFocus}
            aria-keyshortcuts="f"
            onClick={() => setFocusOpen(true)}
          >
            Focus view
          </Button>
        </Inline>
        <ModeSelector
          currentMode={timer.mode}
          onChange={(mode) => usePomodoroStore.getState().selectMode(mode)}
        />

        <Stack gap="5" align="center" paddingBlock="4">
          <Inline align="center" gap="3" wrap justify="center">
            <IconTile icon={info.icon} tone={info.colorScheme} size="sm" />
            <Heading level={2} size="lg">
              {info.label}
            </Heading>
            {timer.mode === 'work' && dailyPomodoros > 0 ? (
              <Badge tone="warning" icon={flame}>
                {`${dailyPomodoros} today`}
              </Badge>
            ) : null}
          </Inline>

          <Stack role="timer" aria-label="Time left" align="center">
            <Heading level={3} size="display">
              {formatTime(timer.timeLeft)}
            </Heading>
          </Stack>
          {/* Announces session changes only, never the per-second ticks. */}
          <Stack role="status" aria-live="polite">
            <VisuallyHidden>{announcement}</VisuallyHidden>
          </Stack>
          <Text size="sm" tone="muted">
            {progress >= 100
              ? "Time's up!"
              : `${Math.floor(timer.timeLeft / 60)} minutes remaining`}
          </Text>

          <Inline gap="3" align="center" justify="center">
            <Button
              // Pause is not destructive: a soft button, Start the solid one.
              variant={timer.isActive ? 'soft' : 'solid'}
              size="lg"
              icon={timer.isActive ? pause : play}
              aria-keyshortcuts="Space"
              onClick={toggle}
            >
              {timer.isActive ? 'Pause' : 'Start'}
            </Button>
            <IconButton
              variant="soft"
              tone="neutral"
              size="lg"
              label="Reset"
              icon={rotateCcw}
              aria-keyshortcuts="r"
              onClick={() => usePomodoroStore.getState().resetTimer()}
            />
            <IconButton
              variant="soft"
              tone="neutral"
              size="lg"
              label="Skip"
              icon={skipForward}
              aria-keyshortcuts="s"
              onClick={skip}
            />
          </Inline>
        </Stack>

        <ProgressBar
          label="Session progress"
          value={Math.min(100, Math.max(0, progress))}
          size="sm"
        />
        <ProgressBar
          label={
            left === 1
              ? 'Long break after this session'
              : `Long break after ${left} more sessions`
          }
          value={position}
          max={every}
          steps={every}
          valueText={`${position} of ${every} sessions`}
          tone="neutral"
          size="xs"
        />

        {timer.mode === 'work' ? (
          <>
            <Divider />
            <CurrentTaskCard />
          </>
        ) : null}
      </Stack>
      <FocusView
        open={focusOpen}
        onClose={() => setFocusOpen(false)}
        onToggle={toggle}
      />
    </Card>
  );
};
