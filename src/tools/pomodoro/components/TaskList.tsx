import {
  Badge,
  Button,
  Card,
  EmptyState,
  Grid,
  ListRows,
  Stack,
  TextField,
} from '@arshad-shah/cynosure';
import { listChecks, plus } from '@arshad-shah/cynosure/icons';
import React, { useState } from 'react';
import { usePomodoroStore } from '../store';
import { TaskRow } from './TaskRow';

/** Today's tasks beside the timer: add, pick the current one, tick, delete. */
export const TaskList: React.FC = () => {
  const tasks = usePomodoroStore((s) => s.tasks);
  const currentTask = usePomodoroStore((s) => s.timer.currentTask);
  const [newTitle, setNewTitle] = useState('');

  const add = () => {
    if (!newTitle.trim()) return;
    usePomodoroStore.getState().addTask(newTitle.trim());
    setNewTitle('');
  };
  const done = tasks.filter((t) => t.completed).length;

  return (
    <Card
      as="section"
      title="Tasks for today"
      actions={
        tasks.length > 0 ? (
          <Badge tone="neutral">{`${done}/${tasks.length} completed`}</Badge>
        ) : undefined
      }
    >
      <Stack gap="4">
        <Grid columns="minmax(0, 1fr) auto" gap="2" align="end">
          <TextField
            label="New task"
            labelHidden
            placeholder="Add a new task"
            value={newTitle}
            onChange={setNewTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button
            variant="soft"
            icon={plus}
            disabled={!newTitle.trim()}
            onClick={add}
          >
            Add
          </Button>
        </Grid>
        {tasks.length === 0 ? (
          <EmptyState
            size="sm"
            icon={listChecks}
            title="No tasks yet"
            description="Add one above, then press it to focus on it."
          />
        ) : (
          <ListRows label="Tasks" divided>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                current={task.id === currentTask}
                onSelect={() =>
                  usePomodoroStore.getState().setCurrentTask(task.id)
                }
                onToggle={() => usePomodoroStore.getState().toggleTask(task.id)}
                onDelete={() => usePomodoroStore.getState().deleteTask(task.id)}
              />
            ))}
          </ListRows>
        )}
      </Stack>
    </Card>
  );
};
