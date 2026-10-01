/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SortableFileList } from './SortableFileList';

const items = [
  { id: 'a', name: 'alpha.pdf', size: 1024 },
  { id: 'b', name: 'beta.pdf', size: 2048 },
];

describe('SortableFileList', () => {
  it('renders the preview in each row', () => {
    render(
      <SortableFileList
        items={items}
        onReorder={() => {}}
        onRemove={() => {}}
        renderPreview={(item) => <span>preview of {item.name}</span>}
      />,
    );
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('preview of alpha.pdf')).toBeTruthy();
    expect(within(rows[1]).getByText('preview of beta.pdf')).toBeTruthy();
  });

  it('calls onRemove with the row id', () => {
    const onRemove = vi.fn();
    render(
      <SortableFileList
        items={items}
        onReorder={() => {}}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove beta.pdf' }));
    expect(onRemove).toHaveBeenCalledExactlyOnceWith('b');
  });

  it('moves the focused row down with Alt+ArrowDown and announces it', () => {
    const onReorder = vi.fn();
    render(
      <SortableFileList
        items={items}
        onReorder={onReorder}
        onRemove={() => {}}
      />,
    );
    const rows = screen.getAllByRole('listitem');
    fireEvent.keyDown(rows[0], { key: 'ArrowDown', altKey: true });
    expect(onReorder).toHaveBeenCalledExactlyOnceWith([items[1], items[0]]);
    expect(screen.getByText('Moved alpha.pdf to position 2 of 2')).toBeTruthy();
  });

  it('ignores plain arrows on rows', () => {
    const onReorder = vi.fn();
    render(
      <SortableFileList
        items={items}
        onReorder={onReorder}
        onRemove={() => {}}
      />,
    );
    fireEvent.keyDown(screen.getAllByRole('listitem')[0], {
      key: 'ArrowDown',
    });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('Enter, Space and Alt+arrows on the Remove button never reorder', () => {
    const onReorder = vi.fn();
    const onRemove = vi.fn();
    render(
      <SortableFileList
        items={items}
        onReorder={onReorder}
        onRemove={onRemove}
      />,
    );
    const remove = screen.getByRole('button', { name: 'Remove alpha.pdf' });
    fireEvent.keyDown(remove, { key: 'Enter' });
    fireEvent.keyDown(remove, { key: ' ' });
    fireEvent.keyDown(remove, { key: 'ArrowDown', altKey: true });
    fireEvent.click(remove);
    expect(onReorder).not.toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalledExactlyOnceWith('a');
  });

  it.each([
    [0, 'ArrowUp'],
    [0, 'ArrowLeft'],
    [1, 'ArrowDown'],
    [1, 'ArrowRight'],
  ])(
    'prevents the browser default for Alt+arrow on row %i (%s) without moving',
    (row, key) => {
      const onReorder = vi.fn();
      render(
        <SortableFileList
          items={items}
          onReorder={onReorder}
          onRemove={() => {}}
        />,
      );
      const rows = screen.getAllByRole('listitem');
      expect(fireEvent.keyDown(rows[row], { key, altKey: true })).toBe(false);
      expect(onReorder).not.toHaveBeenCalled();
    },
  );
});
