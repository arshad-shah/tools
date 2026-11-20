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

const openEdit = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

describe('EditToolbar', () => {
  it('deletes the selected rows from the Edit menu', () => {
    const onEdit = vi.fn(() => true);
    render(<EditToolbar {...props} onEdit={onEdit} selectedRows={[3, 1]} />);
    openEdit();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete 2 rows' }));
    expect(onEdit).toHaveBeenCalledWith({ kind: 'delete-rows', rows: [3, 1] });
  });

  it('names a single row and offers no delete with none selected', () => {
    const { unmount } = render(
      <EditToolbar {...props} onEdit={() => true} selectedRows={[0]} />,
    );
    openEdit();
    expect(screen.getByRole('menuitem', { name: 'Delete row' })).toBeTruthy();
    unmount();
    render(<EditToolbar {...props} onEdit={() => true} selectedRows={[]} />);
    openEdit();
    expect(screen.queryByRole('menuitem', { name: /Delete row/ })).toBeNull();
  });

  it('adds a row at the end from the Edit menu', () => {
    const onEdit = vi.fn(() => true);
    render(<EditToolbar {...props} onEdit={onEdit} selectedRows={[]} />);
    openEdit();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add row' }));
    expect(onEdit).toHaveBeenCalledWith({ kind: 'add-row', at: 5 });
  });
});
