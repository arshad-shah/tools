/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Popover } from './popover';

function Harness({
  modal = false,
  onOpenChange,
}: {
  modal?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const change = (o: boolean) => {
    setOpen(o);
    onOpenChange?.(o);
  };
  return (
    <>
      <button ref={anchor} type="button" onClick={() => change(!open)}>
        Anchor
      </button>
      <button type="button">Elsewhere</button>
      <Popover
        open={open}
        onOpenChange={change}
        anchor={anchor}
        label="Colour"
        modal={modal}
      >
        <button type="button">First</button>
        <button type="button">Last</button>
      </Popover>
    </>
  );
}

const openIt = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Anchor' }));

describe('Popover', () => {
  it('opens as a labelled dialog with focus inside', () => {
    render(<Harness />);
    openIt();
    const dialog = screen.getByRole('dialog', { name: 'Colour' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement?.textContent).toBe('First');
  });

  it('Esc closes and returns focus to the anchor', () => {
    render(<Harness />);
    openIt();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement?.textContent).toBe('Anchor');
  });

  it('outside pointerdown closes', () => {
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);
    openIt();
    act(() => {
      screen
        .getByRole('button', { name: 'Elsewhere' })
        .dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('modal traps Tab inside', () => {
    render(<Harness modal />);
    openIt();
    const last = screen.getByRole('button', { name: 'Last' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement?.textContent).toBe('First');
  });

  it('positions from the anchor rect and exposes the side', () => {
    render(<Harness />);
    const anchor = screen.getByRole('button', { name: 'Anchor' });
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 40, y: 50, width: 80, height: 20 }),
    );
    openIt();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('data-side')).toBe('bottom');
    expect(dialog.style.left).toBe('40px');
    expect(dialog.style.top).toBe('78px');
  });
});
