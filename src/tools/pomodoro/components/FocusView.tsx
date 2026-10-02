import React from 'react';
import { IconPause, IconPlay } from '@/shared/ui/icons';
import {
  Button,
  Center,
  FocusOverlay,
  Heading,
  Stack,
  Text,
} from '@/shared/ui';
import { MODE_INFO } from '../lib/modes';
import { formatTime } from '../lib/time';
import { usePomodoroStore } from '../store';

/**
 * Full-screen focus view (spec §8.6): the session name and a large
 * countdown with start and pause. Esc or Close exits (kit FocusOverlay).
 */
export const FocusView: React.FC<{
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
}> = ({ open, onClose, onToggle }) => {
  const timer = usePomodoroStore((s) => s.timer);
  const info = MODE_INFO[timer.mode];
  return (
    <FocusOverlay open={open} onClose={onClose} label="Focus view">
      <Center className="h-full">
        <Stack gap="8" align="center">
          <Heading level={2} size="2xl">
            {info.label}
          </Heading>
          <Text
            as="p"
            className="text-8xl font-bold tracking-tight tabular-nums sm:text-9xl"
          >
            {formatTime(timer.timeLeft)}
          </Text>
          <Button
            variant={timer.isActive ? 'secondary' : 'primary'}
            size="lg"
            leftIcon={
              timer.isActive ? <IconPause size="lg" /> : <IconPlay size="lg" />
            }
            onClick={onToggle}
          >
            {timer.isActive ? 'Pause' : 'Start'}
          </Button>
          <Text size="sm" tone="subtle">
            Press Esc to exit
          </Text>
        </Stack>
      </Center>
    </FocusOverlay>
  );
};
