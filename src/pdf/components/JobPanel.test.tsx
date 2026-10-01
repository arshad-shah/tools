/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { JobPanel } from './JobPanel';

const base = { progress: null, result: null, error: null };

describe('JobPanel', () => {
  it('renders nothing when idle', () => {
    const { container } = render(
      <JobPanel job={{ ...base, status: 'idle' }} onCancel={() => {}} />,
    );
    expect(container.textContent).toBe('');
  });
  it('shows progress and cancels', () => {
    const onCancel = vi.fn();
    render(
      <JobPanel
        job={{
          ...base,
          status: 'running',
          progress: { done: 2, total: 4, label: 'Copying pages' },
        }}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByText('Copying pages · 2 / 4')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
  it('shows the error message', () => {
    render(
      <JobPanel
        job={{
          ...base,
          status: 'error',
          error: new ToolError('INVALID_INPUT', 'Range 5-2 runs backwards'),
        }}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain(
      'Range 5-2 runs backwards',
    );
  });
  it('shows children when done', () => {
    render(
      <JobPanel
        job={{ ...base, status: 'done', result: 1 }}
        onCancel={() => {}}
      >
        <p>result here</p>
      </JobPanel>,
    );
    expect(screen.getByText('result here')).toBeTruthy();
  });
});
