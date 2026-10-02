/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ModeProps } from '../types';
import { PageSizeDialog } from './PageSizeDialog';

function setup(pageIds = ['p0', 'p1'], result: unknown[] = [{}]) {
  const dispatch = vi.fn(() => result);
  const onOpenChange = vi.fn();
  const ctx = { doc: { dispatch } } as unknown as ModeProps;
  render(
    <PageSizeDialog
      open
      onOpenChange={onOpenChange}
      ctx={ctx}
      pageIds={pageIds}
    />,
  );
  return { dispatch, onOpenChange };
}

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Change size' }));
const width = () =>
  screen.getByLabelText('Width in points') as HTMLInputElement;
const height = () =>
  screen.getByLabelText('Height in points') as HTMLInputElement;

describe('PageSizeDialog', () => {
  it('resizes the given pages to A4 by default and closes', () => {
    const { dispatch, onOpenChange } = setup();
    expect(screen.getByText(/Changes the size of 2 pages/)).toBeTruthy();
    submit();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'page.resize',
      params: { pageIds: ['p0', 'p1'], width: 595.28, height: 841.89 },
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('dispatches Letter when chosen', () => {
    const { dispatch } = setup(['p0']);
    expect(screen.getByText(/the current page/)).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /Letter/ }));
    submit();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'page.resize',
      params: { pageIds: ['p0'], width: 612, height: 792 },
    });
  });

  it('dispatches a custom size in points', () => {
    const { dispatch } = setup(['p0']);
    expect(screen.queryByLabelText('Width in points')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Custom' }));
    fireEvent.change(width(), { target: { value: '300' } });
    fireEvent.change(height(), { target: { value: '400' } });
    submit();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'page.resize',
      params: { pageIds: ['p0'], width: 300, height: 400 },
    });
  });

  it('keeps custom sizes within 1 to 14400 points', () => {
    const { dispatch } = setup(['p0']);
    fireEvent.click(screen.getByRole('radio', { name: 'Custom' }));
    fireEvent.change(width(), { target: { value: '0' } });
    fireEvent.change(height(), { target: { value: '99999' } });
    expect(width().value).toBe('1');
    expect(height().value).toBe('14400');
    submit();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'page.resize',
      params: { pageIds: ['p0'], width: 1, height: 14400 },
    });
  });

  it('Cancel closes without a change', () => {
    const { dispatch, onOpenChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('stays open when the change is refused', () => {
    const { dispatch, onOpenChange } = setup(['p0'], []);
    submit();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('cannot submit with no pages', () => {
    const { dispatch } = setup([]);
    const button = screen.getByRole('button', { name: 'Change size' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    submit();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
