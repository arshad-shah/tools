import { describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { ToolError } from './errors';
import { notify } from './notify';

vi.mock('sonner', () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast };
});

describe('notify', () => {
  it('passes only the message when there is no action', () => {
    notify.success('Saved');
    expect(toast.success).toHaveBeenCalledWith('Saved');
  });

  it('forwards an action', () => {
    const onClick = vi.fn();
    notify.info('Page deleted', { action: { label: 'Undo', onClick } });
    const [, data] = vi.mocked(toast).mock.calls.at(-1)!;
    const action = (data as { action: { label: string; onClick(): void } })
      .action;
    expect(action.label).toBe('Undo');
    action.onClick();
    expect(onClick).toHaveBeenCalled();
  });

  it('forwards a duration', () => {
    notify.success('Pinned', { duration: Infinity });
    expect(toast.success).toHaveBeenLastCalledWith('Pinned', {
      duration: Infinity,
    });
  });

  it('shows a ToolError by its message', () => {
    notify.error(new ToolError('INVALID_FILE', 'Not a PDF.'));
    expect(toast.error).toHaveBeenCalledWith('Not a PDF.');
  });
});
