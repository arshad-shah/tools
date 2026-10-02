/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { IconPen, IconRotateCw, IconUndo } from './icons';
import { FloatingPalette } from './floating-palette';
import { Toolbar, type ToolGroup } from './toolbar';

function groups(anchor?: React.RefObject<HTMLButtonElement | null>) {
  const g: ToolGroup[] = [
    {
      id: 'a',
      label: 'A',
      items: [
        {
          id: 'undo',
          label: 'Undo last change',
          shortLabel: 'Undo',
          icon: IconUndo,
          kind: 'button',
          onSelect: vi.fn(),
          anchor,
        },
        {
          id: 'rotate',
          label: 'Rotate',
          icon: IconRotateCw,
          kind: 'split',
          pressed: true,
          onSelect: vi.fn(),
          menu: [{ id: 'cw', label: 'Right', onSelect: vi.fn() }],
        },
      ],
    },
  ];
  return g;
}

describe('Toolbar layout options (P5-G)', () => {
  it('icon-only by default, with the label as the name', () => {
    render(<Toolbar label="Tools" groups={groups()} />);
    const undo = screen.getByRole('button', { name: 'Undo last change' });
    expect(undo.textContent).toBe('');
  });

  it('labelled shows short labels on desktop, names unchanged (6-H API)', () => {
    render(<Toolbar label="Tools" groups={groups()} labelled />);
    const undo = screen.getByRole('button', { name: 'Undo last change' });
    const text = within(undo).getByText('Undo');
    expect(text.className).toContain('desk:inline');
    // The split main button falls back to its label.
    const rotate = screen.getByRole('button', { name: 'Rotate' });
    expect(within(rotate).getByText('Rotate')).toBeTruthy();
  });

  it('keeps one row that scrolls sideways', () => {
    render(<Toolbar label="Tools" groups={groups()} />);
    const bar = screen.getByRole('toolbar');
    expect(bar.className).toContain('flex-nowrap');
    expect(bar.className).toContain('overflow-x-auto');
    expect(bar.className).not.toContain('flex-wrap ');
  });

  it('a pressed split item says so on its main button', () => {
    render(<Toolbar label="Tools" groups={groups()} />);
    expect(
      screen
        .getByRole('button', { name: 'Rotate' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('hands an item its button as an anchor for a popover', () => {
    const anchor = React.createRef<HTMLButtonElement>();
    render(<Toolbar label="Tools" groups={groups(anchor)} />);
    expect(anchor.current).toBe(
      screen.getByRole('button', { name: 'Undo last change' }),
    );
  });

  it('size lg gives 44px targets', () => {
    render(<Toolbar label="Tools" groups={groups()} size="lg" labelled />);
    const undo = screen.getByRole('button', { name: 'Undo last change' });
    expect(undo.className).toContain('size-touch');
  });

  it('the floating palette takes a trailing slot', () => {
    render(
      <FloatingPalette
        label="Tools"
        groups={[
          {
            id: 'g',
            label: 'G',
            items: [
              {
                id: 'pen',
                label: 'Pen',
                icon: IconPen,
                kind: 'toggle',
                onSelect: () => {},
              },
            ],
          },
        ]}
        side="left"
        onSideChange={() => {}}
        trailing={<span>Width control</span>}
      />,
    );
    expect(screen.getByText('Width control')).toBeTruthy();
  });
});
