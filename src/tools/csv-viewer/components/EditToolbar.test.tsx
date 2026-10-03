/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditToolbar } from './EditToolbar';

const props = {
  columns: ['a', 'b'],
  canUndo: false,
  canRedo: false,
  onUndo: () => {},
  onRedo: () => {},
  rowCount: 5,
};

describe('EditToolbar', () => {
  it('deletes the selected rows', () => {
    const onEdit = vi.fn(() => true);
    render(<EditToolbar {...props} onEdit={onEdit} selectedRows={[3, 1]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete 2 rows' }));
    expect(onEdit).toHaveBeenCalledWith({ kind: 'delete-rows', rows: [3, 1] });
  });

  it('names a single row and is disabled with none selected', () => {
    const { rerender } = render(
      <EditToolbar {...props} onEdit={() => true} selectedRows={[0]} />,
    );
    expect(screen.getByRole('button', { name: 'Delete row' })).toBeTruthy();
    rerender(<EditToolbar {...props} onEdit={() => true} selectedRows={[]} />);
    expect(
      (screen.getByRole('button', { name: 'Delete row' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
