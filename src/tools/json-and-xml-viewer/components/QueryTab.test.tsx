/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryTab } from './QueryTab';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
});

const value = { book: [{ a: 'x' }, { a: 'y' }, { a: 'z' }, { a: 'w' }] };

describe('QueryTab', () => {
  it('Enter runs the query, shows the count, and a click selects', async () => {
    const onSelect = vi.fn();
    render(<QueryTab value={value} xml={null} onSelect={onSelect} />);
    const input = screen.getByRole('textbox', { name: 'JSONPath query' });
    fireEvent.change(input, { target: { value: '$.book[*].a' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByText('4 results')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /\$\.book\[2\]\.a/ }));
    expect(onSelect).toHaveBeenCalledWith('$.book[2].a');
  });

  it('shows a positioned error inline', async () => {
    render(<QueryTab value={value} xml={null} onSelect={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: 'JSONPath query' });
    fireEvent.change(input, { target: { value: '$.book[' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((await screen.findByRole('alert')).textContent).toContain(
      "Expected ']' at column 8",
    );
  });
});
