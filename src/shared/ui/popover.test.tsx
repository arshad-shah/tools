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

  it('Esc closes and returns focus to the anchor', async () => {
    render(<Harness />);
    const anchor = screen.getByRole('button', { name: 'Anchor' });
    anchor.focus();
    openIt();
    const dialog = screen.getByRole('dialog');
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(anchor);
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

  it('is shown in the top layer only while open, its content with it', () => {
    render(<Harness />);
    expect(screen.queryByRole('button', { name: 'First' })).toBeNull();
    openIt();
    const dialog = screen.getByRole('dialog', { name: 'Colour' });
    expect(dialog.matches(':popover-open')).toBe(true);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'First' })).toBeNull();
  });
});

describe('Popover accompanying an editor', () => {
  it('can open without taking focus', () => {
    render(
      <>
        <input aria-label="Editor" autoFocus />
        <Popover
          open
          onOpenChange={() => {}}
          anchor={{ getBoundingClientRect: () => new DOMRect(0, 0, 10, 10) }}
          label="Settings"
          autoFocus={false}
        >
          <button type="button">Bold</button>
        </Popover>
      </>,
    );
    const editor = screen.getByRole('textbox', { name: 'Editor' });
    expect(screen.getByRole('button', { name: 'Bold' })).toBeTruthy();
    expect(document.activeElement).toBe(editor);
  });

  it('moves first focus to initialFocus', async () => {
    function WithField() {
      const field = useRef<HTMLInputElement>(null);
      return (
        <Popover
          open
          onOpenChange={() => {}}
          anchor={{ getBoundingClientRect: () => new DOMRect(0, 0, 10, 10) }}
          label="Note"
          initialFocus={field}
        >
          <button type="button">Bold</button>
          <input ref={field} aria-label="Text" />
        </Popover>
      );
    }
    render(<WithField />);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('textbox', { name: 'Text' }),
      ),
    );
  });
});
