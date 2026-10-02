/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './menu';
import { menuOf } from './menu-dom';

function Menu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-describedby="hint">
        <button type="button">Actions</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent aria-label="Actions">
        <DropdownMenuItem>One</DropdownMenuItem>
        <DropdownMenuItem>Two</DropdownMenuItem>
        <DropdownMenuItem>Three</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

describe('DropdownMenu', () => {
  it('forwards extra trigger props such as aria-describedby', () => {
    render(<Menu />);
    expect(
      screen
        .getByRole('button', { name: 'Actions' })
        .getAttribute('aria-describedby'),
    ).toBe('hint');
  });

  it('portals the menu and links it with aria-controls', () => {
    const { container } = render(<Menu />);
    const trigger = screen.getByRole('button', { name: 'Actions' });
    fireEvent.click(trigger, { detail: 1 });
    const menu = screen.getByRole('menu');
    expect(container.contains(menu)).toBe(false);
    expect(menuOf(trigger)).toBe(menu);
  });

  it('opens from the keyboard on the first item; arrows, Home and End move', async () => {
    render(<Menu />);
    const trigger = screen.getByRole('button', { name: 'Actions' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    await flush();
    const item = (name: string) => screen.getByRole('menuitem', { name });
    expect(document.activeElement).toBe(item('One'));
    fireEvent.keyDown(item('One'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(item('Two'));
    fireEvent.keyDown(item('Two'), { key: 'End' });
    expect(document.activeElement).toBe(item('Three'));
    fireEvent.keyDown(item('Three'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(item('One'));
    fireEvent.keyDown(item('One'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(item('Three'));
    fireEvent.keyDown(item('Three'), { key: 'Home' });
    expect(document.activeElement).toBe(item('One'));
  });

  it('Escape closes and returns focus to the trigger', async () => {
    render(<Menu />);
    const trigger = screen.getByRole('button', { name: 'Actions' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    await flush();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('a pointer click outside the trigger and menu closes it', () => {
    render(<Menu />);
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }), {
      detail: 1,
    });
    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Two' }));
    expect(screen.queryByRole('menu')).not.toBeNull();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
