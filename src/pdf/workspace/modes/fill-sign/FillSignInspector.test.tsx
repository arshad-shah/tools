/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeDetection } from '@/pdf/doc/detection';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { makeModel } from '@/pdf/doc/test-helpers';
import type { ModeProps } from '../types';
import { FillSignInspector } from './FillSignInspector';
import { fillSign } from './store';

beforeAll(() => registerCoreOperations());
beforeEach(() => fillSign.reset());

function ctx(fields: number, filled = 0) {
  const model = makeModel();
  model.setDetection(
    mergeDetection(undefined, 's0', {
      pageIndex: 0,
      skipped: null,
      ms: 1,
      fields: Array.from({ length: fields }, (_, i) => ({
        id: `f${i}`,
        pageIndex: 0,
        rect: { x: 10, y: 700 - 40 * i, width: 100, height: 20 },
        type: 'text' as const,
        label: `Field ${i}`,
        autofill: null,
        confidence: 0.9,
        status: 'field' as const,
        source: 'cell' as const,
      })),
    }),
  );
  for (let i = 0; i < filled; i++)
    model.dispatch({
      type: 'flat.fill',
      params: {
        id: `v${i}`,
        pageId: 'ckpt0:0',
        rect: { x: 10, y: 700 - 40 * i, width: 100, height: 20 },
        kind: 'text',
        value: 'x',
        fieldId: `ckpt0:0/f${i}`,
      },
    });
  const announce = vi.fn();
  return {
    doc: {
      view: model.getView(),
      state: model.getState(),
      announce,
      goToPage: vi.fn(),
      currentPage: 'ckpt0:0',
    },
    selection: { objects: new Set<string>(), clear: vi.fn() },
    tool: { id: null, set: vi.fn() },
  } as unknown as ModeProps & { doc: { announce: typeof announce } };
}

describe('FillSignInspector with nothing selected', () => {
  it('shows the fill summary and the next action', () => {
    const c = ctx(3, 1);
    render(<FillSignInspector {...c} />);
    expect(screen.getByText('1 of 3 fields filled')).toBeTruthy();
    expect(screen.getByText('2 left')).toBeTruthy();
    expect(screen.getByText('0 signatures placed')).toBeTruthy();
    expect(
      screen.getByRole('progressbar', { name: 'Fields filled' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next empty field' }));
    expect(fillSign.get().editing).toBe('ckpt0:0/f1');
  });

  it('says when every field is filled', () => {
    render(<FillSignInspector {...ctx(2, 2)} />);
    expect(screen.getByText('Every field is filled')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Next empty field' }),
    ).toBeNull();
  });

  it('offers a text box when the document has no fields', () => {
    const c = ctx(0);
    render(<FillSignInspector {...c} />);
    expect(screen.getByText('No fields found yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add text box' })).toBeTruthy();
  });
});
