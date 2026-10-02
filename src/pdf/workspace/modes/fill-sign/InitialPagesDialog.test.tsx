/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SignatureContent } from '@/pdf/doc/ops/fill-sign';
import { InitialPagesDialog } from './InitialPagesDialog';

const content: SignatureContent = {
  kind: 'ink',
  vector: { d: 'M0 0L10 0L10 5Z', width: 10, height: 5 },
  color: '#111827',
};
const SELECTED = { fx: 0.1, fy: 0.2, fw: 0.1, fh: 0.05 };
const DEFAULT = { fx: 0.8, fy: 0.05, fw: 0.1, fh: 0.05 };

function open(selectedAnchor = SELECTED as typeof SELECTED | null) {
  const dispatch = vi.fn(() => [{ id: 'op' }]);
  const onOpenChange = vi.fn();
  render(
    <InitialPagesDialog
      open
      onOpenChange={onOpenChange}
      pageIds={['p1', 'p2', 'p3', 'p4']}
      content={content}
      selectedAnchor={selectedAnchor}
      defaultAnchor={DEFAULT}
      dispatch={dispatch as never}
    />,
  );
  return { dispatch, onOpenChange };
}

describe('InitialPagesDialog', () => {
  it('"Every page" initials all pages at the selected initials\' spot', () => {
    const { dispatch, onOpenChange } = open();
    fireEvent.click(screen.getByRole('radio', { name: 'Every page' }));
    expect(
      screen
        .getByRole('checkbox', {
          name: 'Same spot as the selected initials',
        })
        .getAttribute('aria-checked'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Initial 4 pages' }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'sign.initialPages',
      params: {
        id: expect.any(String),
        pageIds: ['p1', 'p2', 'p3', 'p4'],
        anchor: SELECTED,
        content,
      },
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('"Chosen pages" takes a range; without selected initials it uses the default spot', () => {
    const { dispatch } = open(null);
    fireEvent.click(screen.getByRole('radio', { name: 'Chosen pages' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Page ranges' }), {
      target: { value: '2-3' },
    });
    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Same spot as the selected initials',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Initial 2 pages' }));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'sign.initialPages',
      params: expect.objectContaining({
        pageIds: ['p2', 'p3'],
        anchor: DEFAULT,
      }),
    });
  });
});
