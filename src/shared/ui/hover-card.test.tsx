/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HoverCard } from './hover-card';

beforeEach(() => {
  const html = document.documentElement;
  Object.defineProperty(html, 'clientWidth', {
    configurable: true,
    value: window.innerWidth,
  });
  Object.defineProperty(html, 'clientHeight', {
    configurable: true,
    value: window.innerHeight,
  });
});

function Harness({ open, x }: { open: boolean; x: number }) {
  const anchor = useRef<HTMLDivElement>(null);
  return (
    <>
      <div
        ref={(el) => {
          anchor.current = el;
          if (el)
            vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
              DOMRect.fromRect({ x, y: 100, width: 48, height: 64 }),
            );
        }}
      />
      <HoverCard open={open} anchor={anchor} aria-label="Preview of a.pdf">
        <span>big</span>
      </HoverCard>
    </>
  );
}

const card = () =>
  screen.queryByLabelText('Preview of a.pdf') as HTMLElement | null;

describe('HoverCard', () => {
  it('renders nothing while closed', () => {
    render(<Harness open={false} x={10} />);
    expect(card()).toBeNull();
  });

  it('is a passive preview: hidden from assistive tech and inert', () => {
    render(<Harness open x={10} />);
    const surface = card()!.closest('.cy-hover-card') as HTMLElement;
    expect(surface.getAttribute('aria-hidden')).toBe('true');
    expect(surface.hasAttribute('inert')).toBe(true);
    expect(surface.matches(':popover-open')).toBe(true);
  });

  it('sits after its anchor and flips before it at the end edge', async () => {
    const surface = () => card()!.closest('.cy-hover-card') as HTMLElement;
    const { unmount } = render(<Harness open x={10} />);
    await waitFor(() => expect(surface().dataset.placement).toBe('end'));
    expect(parseFloat(surface().style.left)).toBeGreaterThan(58);
    unmount();
    render(<Harness open x={window.innerWidth - 50} />);
    vi.spyOn(surface(), 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 260, height: 340 }),
    );
    window.dispatchEvent(new Event('resize'));
    await waitFor(() => expect(surface().dataset.placement).toBe('start'));
  });
});
