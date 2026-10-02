/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  IconHighlighter,
  IconPen,
  IconRotateCw,
  IconTrash,
  IconUndo,
} from './icons';
import { Toolbar, type ToolGroup } from './toolbar';
import { FloatingPalette } from './floating-palette';

const SHORTCUT = ['Mod', 'Z'].join('+');

function groups(over: { onSplit?: () => void; onMenu?: () => void } = {}) {
  const g: ToolGroup[] = [
    {
      id: 'history',
      label: 'History',
      items: [
        {
          id: 'undo',
          label: 'Undo',
          icon: IconUndo,
          kind: 'button',
          shortcut: SHORTCUT,
          onSelect: vi.fn(),
        },
        {
          id: 'pen',
          label: 'Pen',
          icon: IconPen,
          kind: 'toggle',
          pressed: true,
          onSelect: vi.fn(),
        },
      ],
    },
    {
      id: 'page',
      label: 'Page',
      items: [
        {
          id: 'rotate',
          label: 'Rotate',
          icon: IconRotateCw,
          kind: 'split',
          onSelect: over.onSplit ?? vi.fn(),
          menu: [
            {
              id: 'cw',
              label: 'Rotate right',
              onSelect: over.onMenu ?? vi.fn(),
            },
            { id: 'ccw', label: 'Rotate left', onSelect: vi.fn() },
          ],
        },
        {
          id: 'highlight',
          label: 'Highlight',
          icon: IconHighlighter,
          kind: 'toggle',
          pressed: false,
          onSelect: vi.fn(),
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: IconTrash,
          kind: 'button',
          disabled: 'Select a page first',
          onSelect: vi.fn(),
        },
      ],
    },
  ];
  return g;
}

describe('Toolbar', () => {
  it('is a labelled toolbar with separators between groups', () => {
    render(<Toolbar label="Tools" groups={groups()} />);
    const bar = screen.getByRole('toolbar', { name: 'Tools' });
    expect(bar.getAttribute('aria-orientation')).toBe('horizontal');
    expect(screen.getAllByRole('separator')).toHaveLength(1);
  });

  it('roves a single tab stop with arrows, Home and End', () => {
    render(<Toolbar label="Tools" groups={groups()} />);
    const tabbable = () =>
      screen
        .getAllByRole('button')
        .filter((b) => b.tabIndex === 0)
        .map((b) => b.getAttribute('aria-label'));
    expect(tabbable()).toEqual(['Undo']);
    const undo = screen.getByRole('button', { name: 'Undo' });
    undo.focus();
    fireEvent.keyDown(undo, { key: 'ArrowRight' });
    expect(tabbable()).toEqual(['Pen']);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Pen');
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(tabbable()).toEqual(['Delete']);
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(tabbable()).toEqual(['Undo']);
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(tabbable()).toEqual(['Delete']);
  });

  it('toggles expose aria-pressed and buttons call onSelect', () => {
    const g = groups();
    render(<Toolbar label="Tools" groups={g} />);
    expect(
      screen.getByRole('button', { name: 'Pen' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: 'Highlight' })
        .getAttribute('aria-pressed'),
    ).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(g[0].items[0].onSelect).toHaveBeenCalledOnce();
  });

  it('a disabled item explains why and ignores activation', () => {
    const g = groups();
    render(<Toolbar label="Tools" groups={g} />);
    const del = screen.getByRole('button', { name: 'Delete' });
    expect(del.getAttribute('aria-disabled')).toBe('true');
    const describedBy = del.getAttribute('aria-describedby') ?? '';
    const text = describedBy
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent)
      .join(' ');
    expect(text).toContain('Select a page first');
    fireEvent.click(del);
    expect(g[1].items[2].onSelect).not.toHaveBeenCalled();
  });

  it('the shortcut is part of the tooltip text', () => {
    render(<Toolbar label="Tools" groups={groups()} />);
    const undo = screen.getByRole('button', { name: 'Undo' });
    const id = (undo.getAttribute('aria-describedby') ?? '').split(' ')[0];
    expect(document.getElementById(id)?.textContent).toMatch(/Undo.*Z/);
  });

  it('a split button opens its menu with ArrowDown', () => {
    const onMenu = vi.fn();
    const onSplit = vi.fn();
    render(<Toolbar label="Tools" groups={groups({ onMenu, onSplit })} />);
    const main = screen.getByRole('button', { name: 'Rotate' });
    fireEvent.click(main);
    expect(onSplit).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.keyDown(main, { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rotate right' }));
    expect(onMenu).toHaveBeenCalledOnce();
  });

  it('vertical orientation roves with ArrowDown', () => {
    render(<Toolbar label="Tools" groups={groups()} orientation="vertical" />);
    const undo = screen.getByRole('button', { name: 'Undo' });
    fireEvent.keyDown(undo, { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: 'Pen' }).tabIndex).toBe(0);
  });

  it('size lg gives every control a 44px target (review I11)', () => {
    const { rerender } = render(<Toolbar label="Tools" groups={groups()} />);
    // Default keeps the compact buttons (sized by the sm token).
    expect(screen.getByRole('button', { name: 'Undo' }).className).toContain(
      'size-(--icon-button-sm)',
    );
    rerender(<Toolbar label="Tools" groups={groups()} size="lg" />);
    for (const name of ['Undo', 'Pen', 'Rotate']) {
      const b = screen.getByRole('button', { name });
      expect(b.className).toContain('size-11');
      expect(b.className).not.toContain('--icon-button-sm');
    }
    // The split button's menu trigger is 44px along the bar too.
    expect(
      screen.getByRole('button', { name: 'Rotate options' }).className,
    ).toContain('h-11');
  });
});

describe('FloatingPalette', () => {
  it('is a vertical toolbar whose side moves with Alt+Arrow', () => {
    const onSideChange = vi.fn();
    render(
      <FloatingPalette
        label="Tools"
        groups={groups()}
        side="left"
        onSideChange={onSideChange}
      />,
    );
    const bar = screen.getByRole('toolbar', { name: 'Tools' });
    expect(bar.getAttribute('aria-orientation')).toBe('vertical');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Undo' }), {
      key: 'ArrowRight',
      altKey: true,
    });
    expect(onSideChange).toHaveBeenCalledWith('right');
    fireEvent.keyDown(screen.getByRole('button', { name: /Move tools/ }), {
      key: 'ArrowLeft',
      altKey: true,
    });
    expect(onSideChange).toHaveBeenCalledTimes(1);
  });

  it('size lg gives the tools and the grip 44px targets (review I11)', () => {
    render(
      <FloatingPalette
        label="Tools"
        groups={groups()}
        side="left"
        onSideChange={() => {}}
        size="lg"
      />,
    );
    expect(screen.getByRole('button', { name: 'Undo' }).className).toContain(
      'size-11',
    );
    const grip = screen.getByRole('button', { name: /Move tools/ });
    expect(grip.className).toContain('h-11');
    expect(grip.className).toContain('w-11');
  });
});
