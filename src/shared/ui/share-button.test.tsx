/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShareButton } from './share-button';

const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/shared/lib/notify', () => ({ notify }));

describe('ShareButton', () => {
  it('is disabled with the reason as its tooltip when it cannot share', () => {
    const share = vi.fn();
    render(
      <ShareButton
        share={{ share, canShare: false, reason: 'Too large to share (90 KB)' }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Share' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(tip.textContent).toBe('Too large to share (90 KB)');
    expect(button.getAttribute('aria-describedby')).toBe(tip.id);
    fireEvent.pointerEnter(button);
    expect(document.querySelector('[data-tooltip-bubble]')?.textContent).toBe(
      'Too large to share (90 KB)',
    );
    fireEvent.click(button);
    expect(share).not.toHaveBeenCalled();
  });

  it('shares without a second toast on success', async () => {
    const share = vi.fn().mockResolvedValue('https://example.test/#s=x');
    render(<ShareButton share={{ share, canShare: true }} />);
    const button = screen.getByRole('button', { name: 'Share' });
    expect(button.getAttribute('aria-disabled')).toBeNull();
    await act(async () => {
      fireEvent.click(button);
    });
    expect(share).toHaveBeenCalledTimes(1);
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('does not toast success when sharing fails', async () => {
    notify.success.mockClear();
    const share = vi.fn().mockRejectedValue(new Error('no clipboard'));
    render(<ShareButton share={{ share, canShare: true }} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    });
    expect(notify.success).not.toHaveBeenCalled();
  });
});
