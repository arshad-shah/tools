/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DetectedField } from '@/pdf/detect';
import { mergeDetection } from '@/pdf/doc/detection';
import type { DocumentModel } from '@/pdf/doc/model';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { makeModel } from '@/pdf/doc/test-helpers';
import type { FlatFillParams } from '@/pdf/doc/ops/fill-sign';
import type { DocumentApi, SelectionApi } from '../types';
import { FieldsOverlay } from './FieldsOverlay';
import { fillSign } from './store';

beforeAll(() => registerCoreOperations());
beforeEach(() => fillSign.reset());

const field = (id: string, y: number, label: string): DetectedField => ({
  id,
  pageIndex: 0,
  rect: { x: 210, y, width: 300, height: 20 },
  type: 'text',
  label,
  autofill: null,
  confidence: 0.9,
  status: 'field',
  source: 'cell',
});

const selection: SelectionApi = {
  pages: new Set(),
  objects: new Set(),
  selectPages: () => {},
  selectObjects: () => {},
  clear: () => {},
};

function fakeDoc(model: DocumentModel): DocumentApi {
  const api: Partial<DocumentApi> = {
    view: model.getView(),
    state: model.getState(),
    sources: { s0: { docId: null, info: null } },
    currentPage: 'ckpt0:0',
    dispatch: (op, label) => model.dispatch(op, label),
    setDetection: (d) => model.setDetection(d),
    undo: () => void model.undo(),
    announce: () => {},
    goToPage: () => {},
  };
  return api as DocumentApi;
}

function Harness({ model }: { model: DocumentModel }) {
  useSyncExternalStore(
    (l) => model.subscribe(l),
    () => model.getVersion(),
  );
  const doc = fakeDoc(model);
  return (
    <FieldsOverlay
      doc={doc}
      selection={selection}
      tool={{ id: null, set: () => {} }}
      layout="standard"
      page={doc.view.pages[0]}
      pageNumber={1}
      viewport={
        {
          width: 612,
          height: 792,
          transform: [1, 0, 0, -1, 0, 792],
        } as never
      }
      width={612}
      height={792}
    />
  );
}

function setup() {
  const model = makeModel();
  model.setDetection(
    mergeDetection(undefined, 's0', {
      pageIndex: 0,
      fields: [field('a', 700, 'Surname'), field('b', 650, 'Forename(s)')],
      skipped: null,
      ms: 1,
    }),
  );
  render(<Harness model={model} />);
  return model;
}

const fills = (model: DocumentModel) =>
  (model.getView().overlays.get('ckpt0:0') ?? []).map(
    (o) => (o.params as FlatFillParams).value,
  );

describe('FieldsOverlay', () => {
  it('renders fields as buttons named by type, label and state', () => {
    setup();
    expect(
      screen.getByRole('button', { name: 'Text field: Surname, empty' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Text field: Forename(s), empty' }),
    ).toBeTruthy();
  });

  it('Enter opens the editor; typing and Enter fills and moves on', () => {
    const model = setup();
    fireEvent.click(
      screen.getByRole('button', { name: 'Text field: Surname, empty' }),
    );
    const input = screen.getByRole('textbox', { name: 'Surname' });
    fireEvent.change(input, { target: { value: 'Doe' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(fills(model)).toEqual(['Doe']);
    const next = screen.getByRole('textbox', { name: 'Forename(s)' });
    expect(document.activeElement).toBe(next);
  });

  it('Esc keeps the typed text and closes without moving on', () => {
    const model = setup();
    fireEvent.click(
      screen.getByRole('button', { name: 'Text field: Surname, empty' }),
    );
    const input = screen.getByRole('textbox', { name: 'Surname' });
    fireEvent.change(input, { target: { value: 'Doe' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(fills(model)).toEqual(['Doe']);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('Esc on an untouched field adds nothing', () => {
    const model = setup();
    fireEvent.click(
      screen.getByRole('button', { name: 'Text field: Surname, empty' }),
    );
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Surname' }), {
      key: 'Escape',
    });
    expect(fills(model)).toEqual([]);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('Delete on a detected field dismisses it', () => {
    const model = setup();
    act(() => {
      fireEvent.keyDown(
        screen.getByRole('button', { name: 'Text field: Surname, empty' }),
        { key: 'Delete' },
      );
    });
    const [op] = model.getState().log;
    expect(op).toMatchObject({
      type: 'detect.correct',
      params: { action: 'dismiss' },
    });
    expect(
      screen.queryByRole('button', { name: 'Text field: Surname, empty' }),
    ).toBeNull();
  });
});

describe('text settings still settling', () => {
  it('go in with the value when Enter commits first', () => {
    const model = setup();
    fireEvent.click(
      screen.getByRole('button', { name: 'Text field: Surname, empty' }),
    );
    const key = screen
      .getByRole('textbox', { name: 'Surname' })
      .closest('[data-testid^="field-"]')!
      .getAttribute('data-testid')!
      .slice('field-'.length);
    act(() =>
      fillSign.set({
        styling: {
          key,
          style: { size: 14, color: '#1e3a8a', spacing: 2, comb: 0 },
        },
      }),
    );
    const input = screen.getByRole('textbox', { name: 'Surname' });
    fireEvent.change(input, { target: { value: 'Doe' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const [fill] = model.getView().overlays.get('ckpt0:0')!;
    expect(fill.params).toMatchObject({
      value: 'Doe',
      size: 14,
      color: '#1e3a8a',
      spacing: 2,
    });
    expect(fillSign.get().styling).toBeNull();
  });
});

describe('a new text box being typed', () => {
  it('has resize handles that move its box', () => {
    setup();
    act(() =>
      fillSign.set({
        draft: {
          pageId: 'ckpt0:0',
          rect: { x: 100, y: 400, width: 120, height: 20 },
          kind: 'text',
          style: { size: 11, color: '#000000', spacing: 0, comb: 0 },
        },
      }),
    );
    const frame = screen.getByRole('group', { name: 'Resize new text box' });
    expect(frame.querySelectorAll('[data-handle]')).toHaveLength(8);
    act(() => {
      fireEvent.keyDown(frame, { key: 'ArrowRight', altKey: true });
      fireEvent.keyUp(frame, { key: 'ArrowRight', altKey: true });
    });
    expect(fillSign.get().draft?.rect).toEqual({
      x: 100,
      y: 400,
      width: 121,
      height: 20,
    });
    // Back to typing after the resize.
    expect(document.activeElement).toBe(
      screen.getByRole('textbox', { name: 'Text' }),
    );
  });
});
