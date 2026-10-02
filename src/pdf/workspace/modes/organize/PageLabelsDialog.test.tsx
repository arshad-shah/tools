/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ModeProps } from '../types';
import { PageLabelsDialog } from './PageLabelsDialog';

function setup() {
  const dispatch = vi.fn(() => [{}]);
  const ctx = {
    doc: {
      view: {
        pages: Array.from({ length: 5 }, (_, i) => ({ id: `p${i}` })),
        pageLabels: null,
      },
      dispatch,
    },
  } as unknown as ModeProps;
  render(<PageLabelsDialog open onOpenChange={() => {}} ctx={ctx} />);
  return { dispatch };
}

const range = (n: number) => screen.getByRole('group', { name: `Range ${n}` });
const prefix = (n: number) =>
  within(range(n)).getByLabelText('Prefix') as HTMLInputElement;

describe('PageLabelsDialog', () => {
  it('removing a middle range keeps the other rows and their inputs', () => {
    const { dispatch } = setup();
    const add = screen.getByRole('button', { name: 'Add range' });
    fireEvent.click(add);
    fireEvent.click(add);
    fireEvent.change(prefix(2), { target: { value: 'B-' } });
    fireEvent.change(prefix(3), { target: { value: 'C-' } });
    const third = prefix(3);
    fireEvent.click(screen.getByRole('button', { name: 'Remove range 2' }));
    expect(screen.queryByRole('group', { name: 'Range 3' })).toBeNull();
    // The old third row is now the second, same input element.
    expect(prefix(2)).toBe(third);
    expect(prefix(2).value).toBe('C-');
    fireEvent.click(screen.getByRole('button', { name: 'Save labels' }));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'page.label',
      params: {
        ranges: [
          { start: 0, style: 'D' },
          { start: 2, style: 'D', prefix: 'C-' },
        ],
      },
    });
  });

  it('labels every input of a row', () => {
    setup();
    for (const name of ['From page', 'Style', 'Prefix', 'Start at'])
      expect(within(range(1)).getByLabelText(name)).toBeTruthy();
  });
});
