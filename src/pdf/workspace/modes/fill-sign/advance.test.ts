import { describe, expect, it, vi } from 'vitest';
import type { ModeProps } from '../types';
import { advance } from './actions';
import type { ViewField } from './fields';
import { fillSign } from './store';

const field = (
  key: string,
  pageNumber: number,
  y: number,
  patch: Partial<ViewField> = {},
): ViewField =>
  ({
    key,
    page: { id: `page-${pageNumber}`, source: 's0', index: pageNumber - 1 },
    pageNumber,
    rect: { x: 72, y, width: 100, height: 20 },
    type: 'text',
    label: key,
    status: 'field',
    origin: 'detected',
    filled: false,
    value: '',
    ...patch,
  }) as ViewField;

function ctx() {
  const goToPage = vi.fn();
  const announce = vi.fn();
  return {
    ctx: { doc: { goToPage, announce } } as unknown as ModeProps,
    goToPage,
    announce,
  };
}

describe('advance (Next empty field)', () => {
  it('scrolls the canvas to the next empty field, on its page', () => {
    const { ctx: c, goToPage } = ctx();
    const fields = [
      field('a', 1, 700, { filled: true, value: 'x' }),
      field('b', 7, 400),
    ];
    const next = advance(c, fields, 'a');
    expect(next?.key).toBe('b');
    expect(goToPage).toHaveBeenCalledWith('page-7', {
      box: { x: 72, y: 400, width: 100, height: 20 },
    });
    expect(fillSign.get().editing).toBe('b');
  });

  it('stays put when no empty field is left', () => {
    const { ctx: c, goToPage, announce } = ctx();
    advance(c, [field('a', 1, 700, { filled: true, value: 'x' })], 'a');
    expect(goToPage).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith('No empty fields left');
  });
});
