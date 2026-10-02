import React, { useState } from 'react';
import { IconListTodo, IconPlus } from '@/shared/ui/icons';
import {
  Badge,
  Box,
  Button,
  EmptyState,
  Heading,
  Inline,
  Input,
  Stack,
} from '@/shared/ui';
import { usePomodoroStore } from '../store';
import { TaskRow } from './TaskRow';

export const TaskList: React.FC = () => {
  const tasks = usePomodoroStore((s) => s.tasks);
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    usePomodoroStore.getState().addTask(newTitle.trim());
    setNewTitle('');
  };

  return (
    <Stack gap="4">
      <Inline justify="between" align="center" wrap>
        <Inline align="center" gap="2">
          <IconListTodo size="lg" />
          <Heading level={3} size="md">
            Tasks for today
          </Heading>
        </Inline>
        {tasks.length > 0 && (
          <Badge variant="soft" tone="neutral" size="sm">
            {tasks.filter((t) => t.completed).length}/{tasks.length} completed
          </Badge>
        )}
      </Inline>

      <form onSubmit={handleAdd}>
        <Inline gap="2">
          <Box className="flex-1 min-w-0">
            <Input
              value={newTitle}
              onChange={setNewTitle}
              placeholder="Add a new task…"
              aria-label="New task"
            />
          </Box>
          <Button
            type="submit"
            variant="primary"
            disabled={!newTitle.trim()}
            leftIcon={<IconPlus size="sm" />}
          >
            Add
          </Button>
        </Inline>
      </form>

      <Stack gap="2">
        {tasks.length === 0 ? (
          <EmptyState
            size="sm"
            icon={IconListTodo}
            title="No tasks yet"
            description="Add one using the form above."
          />
        ) : (
          tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => usePomodoroStore.getState().toggleTask(task.id)}
              onDelete={() => usePomodoroStore.getState().deleteTask(task.id)}
            />
          ))
        )}
      </Stack>
    </Stack>
  );
};
