import { Button, Dialog, Heading, Stack, Text } from '@arshad-shah/cynosure';
import { pause, play } from '@arshad-shah/cynosure/icons';
import React from 'react';
import { MODE_INFO } from '../lib/modes';
import { formatTime } from '../lib/time';
import { usePomodoroStore } from '../store';

/**
 * Full-screen focus view (spec §8.6): the session name and a large
 * countdown with start and pause. Esc or Close exits.
 */
export const FocusView: React.FC<{
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
}> = ({ open, onClose, onToggle }) => {
  const timer = usePomodoroStore((s) => s.timer);
  const info = MODE_INFO[timer.mode];
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Focus view"
      titleHidden
      size="full"
    >
      <Stack gap="8" align="center" justify="center" paddingBlock="10">
        <Text size="xl" tone="muted">
          {info.label}
        </Text>
        <Heading level={2} size="display">
          {formatTime(timer.timeLeft)}
        </Heading>
        <Button
          variant={timer.isActive ? 'soft' : 'solid'}
          size="lg"
          icon={timer.isActive ? pause : play}
          onClick={onToggle}
        >
          {timer.isActive ? 'Pause' : 'Start'}
        </Button>
        <Text size="sm" tone="muted">
          Press Esc to exit
        </Text>
      </Stack>
    </Dialog>
  );
};
