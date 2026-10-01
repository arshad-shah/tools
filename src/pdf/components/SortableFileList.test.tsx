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
});
