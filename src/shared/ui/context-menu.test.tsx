/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContextMenu, type ContextMenuEntry } from './context-menu';

const items = (onSelect: () => void): ContextMenuEntry[] => [
  { id: 'dup', label: 'Duplicate', onSelect },
  { id: 'sep', separator: true },
  { id: 'off', label: 'Unavailable', disabled: true, onSelect },
  { id: 'del', label: 'Delete', destructive: true, onSelect },
];

describe('ContextMenu', () => {
  it('lists the items as menu items and focuses the first', () => {
    render(
      <ContextMenu
        open
        at={{ x: 10, y: 10 }}
        label="Object actions"
        items={items(() => {})}
        onClose={() => {}}
      />,
    );
    const menu = screen.getByRole('menu', { name: 'Object actions' });
    expect(menu).toBeTruthy();
    const all = screen.getAllByRole('menuitem');
    expect(all.map((b) => b.textContent)).toEqual([
      'Duplicate',
      'Unavailable',
      'Delete',
    ]);
    expect(screen.getByRole('separator')).toBeTruthy();
  });

  it('arrows move between enabled items and wrap', () => {
    render(
      <ContextMenu
        open
        at={{ x: 10, y: 10 }}
        label="Object actions"
        items={items(() => {})}
        onClose={() => {}}
      />,
    );
    const [dup, , del] = screen.getAllByRole('menuitem');
    dup.focus();
    fireEvent.keyDown(dup, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(del);
    fireEvent.keyDown(del, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(dup);
    fireEvent.keyDown(dup, { key: 'End' });
    expect(document.activeElement).toBe(del);
    fireEvent.keyDown(del, { key: 'Home' });
    expect(document.activeElement).toBe(dup);
  });

  it('runs an item and closes; Esc closes without running', () => {
    const run = vi.fn();
    const close = vi.fn();
    render(
      <ContextMenu
        open
        at={{ x: 10, y: 10 }}
        label="Object actions"
        items={items(run)}
        onClose={close}
      />,
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(run).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Duplicate' }), {
      key: 'Escape',
    });
    expect(close).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    render(
      <ContextMenu
        open={false}
        at={{ x: 0, y: 0 }}
        label="Object actions"
        items={items(() => {})}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
