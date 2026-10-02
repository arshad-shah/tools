/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApplyConfirm } from './ApplyConfirm';

describe('ApplyConfirm', () => {
  it('states what will be removed and applies', () => {
    const onApply = vi.fn();
    render(
      <ApplyConfirm
        open
        areas={3}
        pages={2}
        tagged={false}
        onCancel={() => {}}
        onApply={onApply}
      />,
    );
    expect(
      screen.getByText(
        'Removes the content under 3 marks on 2 pages. You can undo until you export.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Tagged structure/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Apply redactions' }));
    expect(onApply).toHaveBeenCalled();
  });

  it('uses singular words and warns about tagged structure', () => {
    render(
      <ApplyConfirm
        open
        areas={1}
        pages={1}
        tagged
        onCancel={() => {}}
        onApply={() => {}}
      />,
    );
    expect(screen.getByText(/under 1 mark on 1 page\./)).toBeTruthy();
    expect(
      screen.getByText(
        'Tagged structure (used by screen readers) will be removed from this document.',
      ),
    ).toBeTruthy();
  });
});
