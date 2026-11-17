import { Badge, Button, Inline, Stack, Text } from '@arshad-shah/cynosure';
import { play } from '@arshad-shah/cynosure/icons';
import React from 'react';
import { usePomodoroStore } from '../store';

/** What this focus session is for: the current task, the next one, or none. */
export const CurrentTaskCard: React.FC = () => {
  const currentTaskId = usePomodoroStore((s) => s.timer.currentTask);
  const tasks = usePomodoroStore((s) => s.tasks);
  const currentTask = tasks.find((t) => t.id === currentTaskId);

  if (!currentTask) {
    const nextTask = tasks.find((t) => !t.completed);
    if (!nextTask)
      return (
        <Text size="sm" tone="muted" align="center">
          Just focus: a task is optional. Add tasks to track them.
        </Text>
      );
    return (
      <Inline justify="center" align="center" gap="3" wrap>
        <Text size="sm" tone="muted">
          Start working on:
        </Text>
        <Text size="sm" weight="medium">
          {nextTask.title}
        </Text>
        <Button
          variant="soft"
          size="sm"
          icon={play}
          onClick={() =>
            usePomodoroStore.getState().setCurrentTask(nextTask.id)
          }
        >
          Start task
        </Button>
      </Inline>
    );
  }

  return (
    <Stack gap="1" align="center">
      <Text size="sm" tone="muted">
        Working on
      </Text>
      <Inline justify="center" align="center" gap="2" wrap>
        <Text weight="medium">{currentTask.title}</Text>
        <Badge tone="accent">
          {`${currentTask.completedPomodoros}/${currentTask.pomodoros} pomodoros`}
        </Badge>
      </Inline>
    </Stack>
  );
};
