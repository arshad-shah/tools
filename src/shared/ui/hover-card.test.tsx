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

  it('is a passive preview portaled to body', () => {
    render(<Harness open x={10} />);
    expect(card()!.parentElement).toBe(document.body);
    expect(card()!.getAttribute('aria-hidden')).toBe('true');
    expect(card()!.className).toContain('pointer-events-none');
  });

  it('sits right of its anchor and flips left at the right edge', async () => {
    const { unmount } = render(<Harness open x={10} />);
    await waitFor(() => expect(card()!.style.left).toBe('70px'));
    expect(card()!.dataset.side).toBe('right');
    unmount();
    render(<Harness open x={window.innerWidth - 50} />);
    const el = card()!;
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 260, height: 340 }),
    );
    await waitFor(() => expect(el.dataset.side).toBe('left'));
  });
});
