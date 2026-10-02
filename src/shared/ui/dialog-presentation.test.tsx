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
  it('popover: anchored to the tool that opened it, no backdrop', () => {
    render(<Harness presentation="popover" />);
    const d = screen.getByRole('dialog', { name: 'Page size' });
    // Placed by the kit positioner (the floating layer), not as a modal.
    expect(d.className).toContain('z-floating');
    expect(document.querySelector('.backdrop-blur-sm')).toBeNull();
  });

  it('popover: the header close button and Esc close it', () => {
    const onOpenChange = vi.fn();
    render(<Harness presentation="popover" onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('sheet: a bottom sheet across the screen', () => {
    render(<Harness presentation="sheet" />);
    const d = screen.getByRole('dialog', { name: 'Page size' });
    expect(d.getAttribute('data-presentation')).toBe('sheet');
    expect(d.className).toContain('bottom-0');
    expect(d.className).toContain('rounded-t-xl');
  });

  it('dialog: centred as before', () => {
    render(<Harness presentation="dialog" />);
    const d = screen.getByRole('dialog', { name: 'Page size' });
    expect(d.getAttribute('data-presentation')).toBe('dialog');
  });
});
