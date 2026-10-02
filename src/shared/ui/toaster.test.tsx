/** @vitest-environment jsdom */
import { act, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';
import { notify } from '@/shared/lib/notify';
import { Toaster } from './toaster';

describe('Toaster', () => {
  it('renders kit icons, never sonner glyph icons', async () => {
    render(<Toaster />);
    act(() => {
      toast.success('Saved 3 files');
    });
    const text = await screen.findByText('Saved 3 files');
    const item = text.closest('li')!;
    const svgs = [...item.querySelectorAll('svg')];
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs)
      expect(svg.getAttribute('class')).toContain('lucide');
  });

  it('errors are also announced assertively', () => {
    vi.useFakeTimers();
    notify.error('That file is not a PDF');
    vi.advanceTimersByTime(100);
    expect(
      document.querySelector('[data-announcer="assertive"]')?.textContent,
    ).toBe('That file is not a PDF');
    vi.useRealTimers();
  });
});
