/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchInput } from './search-input';
import { Textarea } from './textarea';

describe('SearchInput', () => {
  it('is a named searchbox with a clear button', () => {
    const onChange = vi.fn();
    render(
      <SearchInput aria-label="Search tools" value="pdf" onChange={onChange} />,
    );
    const box = screen.getByRole('searchbox', { name: 'Search tools' });
    fireEvent.change(box, { target: { value: 'pdfs' } });
    expect(onChange).toHaveBeenLastCalledWith('pdfs');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('passes Enter to the call site and keeps its description', () => {
    const onKeyDown = vi.fn();
    render(
      <SearchInput
        aria-label="Search the tree"
        value="a"
        onChange={() => {}}
        onKeyDown={onKeyDown}
        aria-describedby="err"
      />,
    );
    const box = screen.getByRole('searchbox', { name: 'Search the tree' });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(box.getAttribute('aria-describedby')).toBe('err');
  });
});

describe('Textarea', () => {
  it('is named by its label and reports edits', () => {
    const onChange = vi.fn();
    render(
      <>
        <label htmlFor="t">Holidays</label>
        <Textarea id="t" value="" rows={4} onChange={onChange} />
      </>,
    );
    const area = screen.getByRole('textbox', { name: 'Holidays' });
    expect(area.getAttribute('rows')).toBe('4');
    fireEvent.change(area, { target: { value: '2024-12-25' } });
    expect(onChange).toHaveBeenLastCalledWith('2024-12-25');
  });

  it('forwards the ref and read-only', () => {
    const ref = { current: null as HTMLTextAreaElement | null };
    render(<Textarea ref={ref} aria-label="Preview" value="x" readOnly />);
    const area = screen.getByRole('textbox', { name: 'Preview' });
    expect(ref.current).toBe(area);
    expect((area as HTMLTextAreaElement).readOnly).toBe(true);
  });
});
