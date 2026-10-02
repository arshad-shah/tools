/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ModeProps } from '../types';
import { StyleControl } from './StyleControl';
import { getAnnotateUi } from './ui-store';

const ctx = (
  layout: ModeProps['layout'],
  selected: string[] = [],
  overlays = new Map<string, unknown[]>(),
) => {
  const dispatch = vi.fn(() => []);
  return {
    props: {
      layout,
      selection: { objects: new Set(selected) },
      doc: { view: { overlays }, dispatch },
    } as unknown as ModeProps,
    dispatch,
  };
};

describe('Annotate style in the toolbar (backlog P5-D)', () => {
  it('a Style button opens colour, opacity and width by the tool', () => {
    render(<StyleControl ctx={ctx('standard').props} />);
    const button = screen.getByRole('button', { name: /^Style/ });
    fireEvent.click(button);
    const panel = screen.getByRole('dialog', { name: 'Annotation style' });
    expect(panel.getAttribute('data-presentation')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Red' }));
    expect(getAnnotateUi().color).toBe('#ff4d4d');
    fireEvent.click(screen.getByRole('radio', { name: 'Bold' }));
    expect(getAnnotateUi().width).toBe(4);
    expect(screen.getByRole('slider', { name: 'Opacity' })).toBeTruthy();
  });

  it('is a bottom sheet on phones', () => {
    render(<StyleControl ctx={ctx('phone').props} />);
    fireEvent.click(screen.getByRole('button', { name: /^Style/ }));
    expect(
      screen
        .getByRole('dialog', { name: 'Annotation style' })
        .getAttribute('data-presentation'),
    ).toBe('sheet');
  });

  it('recolours the selected annotation as one step', () => {
    const overlays = new Map([
      [
        'p1',
        [{ opId: 'a1', type: 'annot.highlight', params: { color: '#ffd400' } }],
      ],
    ]);
    const { props, dispatch } = ctx('standard', ['a1'], overlays);
    render(<StyleControl ctx={props} />);
    fireEvent.click(screen.getByRole('button', { name: /^Style/ }));
    expect(
      screen.getByRole('radiogroup', {
        name: 'Colour of the selected annotation',
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Red' }));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'annot.update',
      params: {
        pageId: 'p1',
        target: { kind: 'pending', id: 'a1' },
        patch: { color: '#ff4d4d' },
      },
    });
  });
});
