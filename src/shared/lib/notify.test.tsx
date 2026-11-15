/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '@/shared/ui/toaster';
import { ToolError } from './errors';
import { notify, resetNotifyForTests } from './notify';

afterEach(() => {
  vi.useRealTimers();
  resetNotifyForTests();
});

describe('notify (Cynosure toasts, tools#104)', () => {
  it('shows a success toast politely', async () => {
    render(<Toaster />);
    act(() => void notify.success('Saved'));
    const toast = await screen.findByText('Saved');
    expect(toast.closest('[role="status"]')).not.toBeNull();
  });

  it('shows a ToolError by its message, announced assertively once', async () => {
    render(<Toaster />);
    act(() => void notify.error(new ToolError('INVALID_FILE', 'Not a PDF.')));
    const toast = await screen.findByText('Not a PDF.');
    expect(toast.closest('[role="alert"]')).not.toBeNull();
    // Cynosure's alert is the one announcement: nothing in a second region.
    expect(
      document.querySelector('[data-announcer="assertive"]')?.textContent ?? '',
    ).toBe('');
  });

  it('an action runs once and closes its toast, as before', async () => {
    const onClick = vi.fn();
    render(<Toaster />);
    act(
      () =>
        void notify.info('Page deleted', {
          action: { label: 'Undo', onClick },
        }),
    );
    await screen.findByText('Page deleted');
    // The toast region is a popover, which jsdom never shows: query hidden too.
    fireEvent.click(
      await screen.findByRole('button', { name: 'Undo', hidden: true }),
    );
    expect(onClick).toHaveBeenCalledTimes(1);
    await vi.waitFor(() =>
      expect(screen.queryByText('Page deleted')).toBeNull(),
    );
  });

  it('a duration of Infinity keeps the toast until dismissed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<Toaster />);
    act(() => void notify.success('Pinned', { duration: Infinity }));
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText('Pinned')).toBeTruthy();
  });

  it('a toast raised before the Toaster mounts shows once it mounts', async () => {
    expect(() => notify.info('Early')).not.toThrow();
    render(<Toaster />);
    expect(await screen.findAllByText('Early')).toHaveLength(1);
  });
});
