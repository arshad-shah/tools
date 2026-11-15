/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog, DialogBody, DialogHeader, DialogTitle } from './dialog';

afterEach(() => vi.restoreAllMocks());

function Harness({
  presentation,
  onOpenChange = () => {},
}: {
  presentation: 'dialog' | 'popover' | 'sheet';
  onOpenChange?: (o: boolean) => void;
}) {
  const anchor = React.useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={anchor} type="button">
        Page size
      </button>
      <Dialog
        open
        onOpenChange={onOpenChange}
        label="Page size"
        presentation={presentation}
        anchor={anchor}
      >
        <DialogHeader>
          <DialogTitle>Page size</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <button type="button">A4</button>
        </DialogBody>
      </Dialog>
    </>
  );
}

describe('Dialog presentations (backlog P5-B)', () => {
  it('popover: anchored to the tool that opened it, not modal', () => {
    render(<Harness presentation="popover" />);
    const d = screen.getByRole('dialog', { name: 'Page size' });
    // A top-layer popover beside the anchor, not a modal <dialog>.
    expect(d.tagName).toBe('DIV');
    expect(d.matches(':popover-open')).toBe(true);
    expect(screen.getByRole('heading', { name: 'Page size' })).toBeTruthy();
  });

  it('popover: the header close button and Esc close it', () => {
    const onOpenChange = vi.fn();
    render(<Harness presentation="popover" onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    onOpenChange.mockClear();
    fireEvent.keyDown(screen.getByRole('button', { name: 'A4' }), {
      key: 'Escape',
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('sheet: a modal docked to the bottom edge', () => {
    render(<Harness presentation="sheet" />);
    const d = screen.getByRole('dialog', { name: 'Page size' });
    expect(d.tagName).toBe('DIALOG');
    expect(d.getAttribute('data-side')).toBe('bottom');
  });

  it('dialog: a centred modal', () => {
    render(<Harness presentation="dialog" />);
    const d = screen.getByRole('dialog', { name: 'Page size' });
    expect(d.tagName).toBe('DIALOG');
    expect(d.hasAttribute('data-side')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  });
});
