/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './menu';

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
  it('portals its content and names it from the trigger', () => {
    const trigger = setup();
    fireEvent.click(trigger, { detail: 1 });
    const menu = screen.getByRole('menu', { name: 'Actions' });
    expect(menu.parentElement).toBe(document.body);
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('a pointer click inside the portaled menu selects, not dismisses', () => {
    const onRename = vi.fn();
    const trigger = setup(onRename);
    fireEvent.click(trigger, { detail: 1 });
    fireEvent.mouseDown(item('Rename'));
    fireEvent.click(item('Rename'));
    expect(onRename).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('outside mousedown closes', () => {
    const trigger = setup();
    fireEvent.click(trigger, { detail: 1 });
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opening from the keyboard focuses the first item; arrows move', async () => {
    const trigger = setup();
    fireEvent.click(trigger, { detail: 0 });
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(item('Duplicate'));
    fireEvent.keyDown(menu, { key: 'End' });
    expect(document.activeElement).toBe(item('Delete'));
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(item('Rename'));
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
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
