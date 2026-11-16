import { Badge, IconButton, ListRow } from '@arshad-shah/cynosure';
import { checkCircle, circle, trash } from '@arshad-shah/cynosure/icons';
import React from 'react';
import type { Task } from '../types';

/**
 * One task: pressing it makes it the current task; its actions tick it off
 * and delete it.
 */
export const TaskRow: React.FC<{
  task: Task;
  current: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
}> = ({ task, current, onSelect, onToggle, onDelete }) => (
  <ListRow
    label={task.title}
    description={current ? 'Current task' : undefined}
    active={current}
    dimmed={task.completed}
    onClick={onSelect}
    trailing={
      <Badge
        tone={task.completedPomodoros >= task.pomodoros ? 'success' : 'accent'}
      >
        {`${task.completedPomodoros}/${task.pomodoros}`}
      </Badge>
    }
    actions={
      <>
        <IconButton
          variant="ghost"
          size="sm"
          tone={task.completed ? 'success' : 'neutral'}
          label={task.completed ? 'Mark incomplete' : 'Mark complete'}
          aria-pressed={task.completed}
          icon={task.completed ? checkCircle : circle}
          onClick={onToggle}
        />
        <IconButton
          variant="ghost"
          size="sm"
          tone="danger"
          label="Delete task"
          icon={trash}
          onClick={onDelete}
        />
      </>
    }
  />
);
