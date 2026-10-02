/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeDetection } from '@/pdf/doc/detection';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { makeModel } from '@/pdf/doc/test-helpers';
import type { ModeProps } from '../types';
import { FillSignInspector } from './FillSignInspector';
import { FREE } from './fields';
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
    model,
    doc: {
      view: model.getView(),
      state: model.getState(),
      announce,
      goToPage: vi.fn(),
      currentPage: 'ckpt0:0',
    },
    selection: { objects: new Set<string>(), clear: vi.fn() },
    tool: { id: null, set: vi.fn() },
  } as unknown as ModeProps & {
    doc: { announce: typeof announce };
    model: typeof model;
  };
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

describe('FillSignInspector with a free box selected', () => {
  function withFree(kind: 'text' | 'tick') {
    const c = ctx(0);
    const [op] = c.model.dispatch({
      type: 'flat.fill',
      params: {
        id: 'free1',
        pageId: 'ckpt0:0',
        rect: { x: 50, y: 500, width: 120, height: 20 },
        kind,
        value: kind === 'text' ? 'Hello' : 'yes',
        fieldId: `${FREE}free1`,
      },
    });
    const dispatch = vi.fn(() => [{ id: 'removed' }]);
    const props = {
      ...c,
      doc: {
        ...c.doc,
        view: c.model.getView(),
        state: c.model.getState(),
        dispatch,
      },
      selection: { objects: new Set([op.id]), clear: vi.fn() },
    } as unknown as ModeProps;
    return { props, dispatch, opId: op.id };
  }

  it('gives a text box its settings and Delete', () => {
    const { props, dispatch, opId } = withFree('text');
    render(<FillSignInspector {...props} />);
    expect(screen.getByText('Text box')).toBeTruthy();
    const before = fillSign.get().barFocus;
    fireEvent.click(screen.getByRole('button', { name: 'Text settings' }));
    expect(fillSign.get().barFocus).toBe(before + 1);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(dispatch).toHaveBeenCalledWith([
      { type: 'object.remove', params: { targetId: opId } },
    ]);
    expect(props.selection.clear).toHaveBeenCalled();
  });

  it('gives a tick Delete only', () => {
    const { props } = withFree('tick');
    render(<FillSignInspector {...props} />);
    expect(screen.getByText('Tick')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Text settings' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
  });
});
