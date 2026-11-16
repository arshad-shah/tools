/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './menu';
import { IconCopy } from './icons';

function setup(onRename = vi.fn()) {
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>
        <button type="button">Menu</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent aria-label="Actions">
        <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuItem>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  return screen.getByRole('button', { name: 'Menu' });
}

const item = (name: string) => screen.getByRole('menuitem', { name });

describe('DropdownMenu', () => {
  it('opens a named menu the trigger controls', () => {
    const trigger = setup();
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(trigger, { detail: 1 });
    const menu = screen.getByRole('menu', { name: 'Actions' });
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('a pointer click inside the portaled menu selects, not dismisses', () => {
    const onRename = vi.fn();
    const trigger = setup(onRename);
    fireEvent.click(trigger, { detail: 1 });
    fireEvent.pointerDown(item('Rename'));
    fireEvent.click(item('Rename'));
    expect(onRename).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('outside pointerdown closes', () => {
    const trigger = setup();
    fireEvent.click(trigger, { detail: 1 });
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opening from the keyboard focuses the first item; arrows move', async () => {
    const trigger = setup();
    fireEvent.click(trigger, { detail: 0 });
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));
    const key = (k: string) =>
      fireEvent.keyDown(document.activeElement!, { key: k });
    key('ArrowDown');
    expect(document.activeElement).toBe(item('Duplicate'));
    key('End');
    expect(document.activeElement).toBe(item('Delete'));
    key('ArrowDown');
    expect(document.activeElement).toBe(item('Rename'));
    key('ArrowUp');
    expect(document.activeElement).toBe(item('Delete'));
  });

  it('Tab hands focus back to the trigger and closes', async () => {
    const trigger = setup();
    fireEvent.click(trigger, { detail: 0 });
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    expect(document.activeElement).toBe(trigger);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Escape closes and returns focus to the trigger', async () => {
    const trigger = setup();
    fireEvent.click(trigger, { detail: 0 });
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));
    fireEvent.keyDown(item('Rename'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe('DropdownMenu item icons', () => {
  it("draws a kit icon in the item's children as the item's icon", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>
          <button type="button">Menu</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent aria-label="Actions">
          <DropdownMenuItem>
            <IconCopy size="sm" aria-hidden />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }), {
      detail: 1,
    });
    // The icon adds nothing to the item's name, and is drawn decoratively.
    const dup = screen.getByRole('menuitem', { name: 'Duplicate' });
    const svg = dup.querySelectorAll('svg');
    expect(svg).toHaveLength(1);
    expect(svg[0]!.getAttribute('aria-hidden')).toBe('true');
    expect(
      screen.getByRole('menuitem', { name: 'Delete' }).querySelector('svg'),
    ).toBeNull();
  });
});
