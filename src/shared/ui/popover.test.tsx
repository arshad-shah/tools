/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Popover } from './popover';

// jsdom lays nothing out: give the viewport the window's size, so the
// positioner's clipping rect is not empty.
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
  it('opens as a labelled dialog with focus inside once placed', async () => {
    render(<Harness />);
    openIt();
    const dialog = screen.getByRole('dialog', { name: 'Colour' });
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
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

  it('positions from the anchor rect and exposes the side', async () => {
    render(<Harness />);
    const anchor = screen.getByRole('button', { name: 'Anchor' });
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 40, y: 50, width: 80, height: 20 }),
    );
    openIt();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('data-side')).toBe('bottom');
    await waitFor(() => expect(dialog.style.left).toBe('40px'));
    expect(dialog.style.top).toBe('78px');
    expect(dialog.style.position).toBe('fixed');
  });

  it('flips to the top when the anchor sits at the bottom edge', async () => {
    render(<Harness />);
    const anchor = screen.getByRole('button', { name: 'Anchor' });
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({
        x: 40,
        y: window.innerHeight - 20,
        width: 80,
        height: 20,
      }),
    );
    openIt();
    const dialog = screen.getByRole('dialog');
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 200, height: 120 }),
    );
    await waitFor(() => expect(dialog.getAttribute('data-side')).toBe('top'));
  });
});

describe('Popover accompanying an editor', () => {
  it('can open without taking focus and stay open on outside pointer-downs', () => {
    const onOpenChange = vi.fn();
    render(
      <>
        <input aria-label="Editor" autoFocus />
        <Popover
          open
          onOpenChange={onOpenChange}
          anchor={{ getBoundingClientRect: () => new DOMRect(0, 0, 10, 10) }}
          label="Settings"
          autoFocus={false}
          dismissOnOutside={false}
        >
          <button type="button">Bold</button>
        </Popover>
      </>,
    );
    const editor = screen.getByRole('textbox', { name: 'Editor' });
    expect(document.activeElement).toBe(editor);
    fireEvent.pointerDown(editor);
    const bold = screen.getByRole('button', { name: 'Bold' });
    fireEvent.blur(bold, { relatedTarget: editor });
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
