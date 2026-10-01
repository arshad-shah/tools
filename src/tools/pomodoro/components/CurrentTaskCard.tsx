import React from 'react';
import { CheckCircle2, Circle, ListTodo } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardBody,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import { usePomodoroStore } from '../store';

export const CurrentTaskCard: React.FC = () => {
  const currentTaskId = usePomodoroStore((s) => s.timer.currentTask);
  const tasks = usePomodoroStore((s) => s.tasks);
  const currentTask = tasks.find((t) => t.id === currentTaskId);

  if (!currentTask) {
    const nextTask = tasks.find((t) => !t.completed);
    if (!nextTask) {
      return (
        <Alert status="info" icon={<ListTodo aria-hidden />}>
          <AlertDescription>
            No active task. Add tasks from the menu to get started.
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <Card>
        <CardBody>
          <Inline justify="between" align="center" gap="3" wrap>
            <Inline align="center" gap="2">
              <ListTodo size={18} aria-hidden />
              <Stack gap="0">
                <Text size="xs" tone="subtle">
                  Start working on:
                </Text>
                <Text size="sm" weight="medium">
                  {nextTask.title}
                </Text>
              </Stack>
            </Inline>
            <Button
              variant="solid"
              size="sm"
              onClick={() =>
                usePomodoroStore.getState().setCurrentTask(nextTask.id)
              }
            >
              Start task
            </Button>
          </Inline>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <Inline justify="between" align="center" gap="3" wrap>
          <Inline align="center" gap="2">
            {currentTask.completed ? (
              <CheckCircle2 size={20} aria-hidden />
            ) : (
              <Circle size={20} aria-hidden />
            )}
            <Text size="sm" weight="medium">
              {currentTask.title}
            </Text>
          </Inline>
          <Badge variant="soft" tone="accent" size="sm" pill>
            {currentTask.completedPomodoros}/{currentTask.pomodoros} pomodoros
          </Badge>
        </Inline>
      </CardBody>
    </Card>
  );
};
