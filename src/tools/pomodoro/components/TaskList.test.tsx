/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePomodoroStore } from '../store';
import { TaskList } from './TaskList';

describe('TaskList', () => {
  beforeEach(() => {
    usePomodoroStore.setState({ tasks: [] });
    usePomodoroStore.getState().setCurrentTask(null);
  });

  it('adds a task with Enter or Add, and not a blank one', () => {
    render(<TaskList />);
    const field = screen.getByRole('textbox', { name: 'New task' });
    const add = screen.getByRole('button', { name: 'Add' });
    expect((add as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(field, { target: { value: '  Write  ' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.change(field, { target: { value: 'Read' } });
    fireEvent.click(add);
    expect(usePomodoroStore.getState().tasks.map((t) => t.title)).toEqual([
      'Write',
      'Read',
    ]);
    expect((field as HTMLInputElement).value).toBe('');
  });

  it('picks the current task, ticks it off and deletes it', () => {
    usePomodoroStore.getState().addTask('Write');
    render(<TaskList />);
    fireEvent.click(screen.getByRole('button', { name: /^Write/ }));
    const id = usePomodoroStore.getState().tasks[0].id;
    expect(usePomodoroStore.getState().timer.currentTask).toBe(id);
    expect(screen.getByText('Current task')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
    expect(usePomodoroStore.getState().tasks[0].completed).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Mark incomplete' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByText('1/1 completed')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }));
    expect(usePomodoroStore.getState().tasks).toHaveLength(0);
    expect(screen.getByText('No tasks yet')).toBeTruthy();
  });
});
