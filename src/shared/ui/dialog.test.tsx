/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Drawer } from './drawer';
import { ProgressOverlay } from './progress-overlay';

describe('Dialog and Drawer names (axe aria-dialog-name)', () => {
  it('a Dialog is named by its title and described by its description', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogHeader>
          <DialogTitle>Delete pages?</DialogTitle>
          <DialogDescription>You can undo it.</DialogDescription>
        </DialogHeader>
        <DialogBody>x</DialogBody>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Delete pages?' });
    const desc = document.getElementById(
      dialog.getAttribute('aria-describedby')!,
    );
    expect(desc?.textContent).toBe('You can undo it.');
  });

  it('a Dialog without a title takes a label', () => {
    render(
      <Dialog open onOpenChange={() => {}} label="Preview">
        <DialogBody>x</DialogBody>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Preview' })).toBeTruthy();
    expect(screen.getByRole('dialog').hasAttribute('aria-describedby')).toBe(
      false,
    );
  });

  it('a Drawer is named by its title, or by its label', () => {
    const { rerender } = render(
      <Drawer open onOpenChange={() => {}} title="Settings">
        x
      </Drawer>,
    );
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
    rerender(
      <Drawer open onOpenChange={() => {}} label="Filters">
        x
      </Drawer>,
    );
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeTruthy();
  });
});

describe('Escape goes to the topmost overlay only (review I8)', () => {
  const esc = () => {
    const e = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    (document.activeElement ?? document.body).dispatchEvent(e);
    return e;
  };

  it('Esc cancels the progress overlay, not the dialog under it', () => {
    const onOpenChange = vi.fn();
    const onCancel = vi.fn();
    const ui = (progress: boolean) => (
      <>
        <Dialog open onOpenChange={onOpenChange} label="Export">
          <DialogBody>x</DialogBody>
        </Dialog>
        <ProgressOverlay
          open={progress}
          title="Exporting"
          progress={null}
          onCancel={onCancel}
        />
      </>
    );
    const { rerender } = render(ui(true));
    const first = esc();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(first.defaultPrevented).toBe(true);
    // The progress overlay closes; the next Esc reaches the dialog.
    rerender(ui(false));
    esc();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('a Drawer over a Dialog takes Esc first', () => {
    const dialog = vi.fn();
    const drawer = vi.fn();
    render(
      <>
        <Dialog open onOpenChange={dialog} label="Settings">
          <DialogBody>x</DialogBody>
        </Dialog>
        <Drawer open onOpenChange={drawer} label="Pages">
          y
        </Drawer>
      </>,
    );
    esc();
    expect(drawer).toHaveBeenCalledWith(false);
    expect(dialog).not.toHaveBeenCalled();
  });

  it('an inline onOpenChange does not move a dialog back to the top', () => {
    const below = vi.fn();
    const top = vi.fn();
    const ui = (n: number) => (
      <>
        <Dialog open onOpenChange={(o) => below(o, n)} label="Below">
          <DialogBody>x</DialogBody>
        </Dialog>
        <Dialog open onOpenChange={top} label="Top">
          <DialogBody>y</DialogBody>
        </Dialog>
      </>
    );
    const { rerender } = render(ui(1));
    rerender(ui(2));
    esc();
    expect(top).toHaveBeenCalledWith(false);
    expect(below).not.toHaveBeenCalled();
  });
});
