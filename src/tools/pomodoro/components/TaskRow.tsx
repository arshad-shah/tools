import React from 'react';
import {
  IconCheckCircle2,
  IconCircle,
  IconTimer,
  IconTrash2,
} from '@/shared/ui/icons';
import { Badge, Card, CardBody, IconButton, Inline, Text } from '@/shared/ui';
import type { Task } from '../types';

export const TaskRow: React.FC<{
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}> = ({ task, onToggle, onDelete }) => (
  <Card>
    <CardBody>
      <Inline justify="between" align="center" gap="3" wrap>
        <Inline align="center" gap="3" wrap>
          <IconButton
            variant="ghost"
            size="sm"
            label={task.completed ? 'Mark incomplete' : 'Mark complete'}
            icon={
              task.completed ? (
                <IconCheckCircle2 size="lg" />
              ) : (
                <IconCircle size="lg" />
              )
            }
            onClick={onToggle}
          />
          <Text
            size="sm"
            weight="medium"
            className={task.completed ? 'line-through opacity-60' : undefined}
          >
            {task.title}
          </Text>
        </Inline>
        <Inline gap="2" align="center">
          <Badge
            variant="soft"
            tone={
              task.completedPomodoros >= task.pomodoros ? 'success' : 'accent'
            }
            size="sm"
            pill
            icon={<IconTimer size="xs" />}
          >
            {task.completedPomodoros}/{task.pomodoros}
          </Badge>
          <IconButton
            variant="danger"
            size="sm"
            label="Delete task"
            icon={<IconTrash2 size="sm" />}
            onClick={onDelete}
          />
        </Inline>
      </Inline>
    </CardBody>
  </Card>
);
