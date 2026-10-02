/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Drawer } from './drawer';

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
