/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilePicker } from './file-upload';

describe('FilePicker', () => {
  it('opens the hidden input, reports chosen files and resets the input', () => {
    const onFiles = vi.fn();
    const { container } = render(
      <FilePicker accept=".txt" onFiles={onFiles}>
        {(open) => <button onClick={open}>Pick</button>}
      </FilePicker>,
    );
    const input = container.querySelector(
      'input[type=file]',
    ) as HTMLInputElement;
    expect(input.accept).toBe('.txt');
    const click = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByText('Pick'));
    expect(click).toHaveBeenCalled();
    const f = new File(['x'], 'a.txt');
    fireEvent.change(input, { target: { files: [f] } });
    expect(onFiles).toHaveBeenCalledWith([f]);
    expect(input.value).toBe('');
  });

  it('ignores an empty selection', () => {
    const onFiles = vi.fn();
    const { container } = render(
      <FilePicker onFiles={onFiles}>{() => null}</FilePicker>,
    );
    const input = container.querySelector(
      'input[type=file]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(onFiles).not.toHaveBeenCalled();
  });
});
