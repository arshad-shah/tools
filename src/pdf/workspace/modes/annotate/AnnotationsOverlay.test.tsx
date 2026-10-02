/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useState, useSyncExternalStore } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { DocumentModel } from '@/pdf/doc/model';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { makeModel } from '@/pdf/doc/test-helpers';
import type { ExistingAnnotation } from '@/pdf/render/annotations';
import type { DocumentApi, SelectionApi } from '../types';
import { AnnotationsOverlay } from './AnnotationsOverlay';
import { getAnnotateUi, setAnnotateUi } from './ui-store';

beforeAll(() => registerCoreOperations());
afterEach(() => {
  cleanup();
  setAnnotateUi({ selectedExisting: null });
});

const SQUARE: ExistingAnnotation = {
  ref: '12R',
  subtype: 'Square',
  rect: { x: 100, y: 600, width: 50, height: 20 },
  color: '#ff0000',
  author: 'Alice',
  contents: 'Box',
  modified: null,
  inReplyTo: null,
  quadPoints: null,
  editable: true,
  index: 0,
};

function Harness({ model }: { model: DocumentModel }) {
  useSyncExternalStore(
    (l) => model.subscribe(l),
    () => model.getVersion(),
  );
  const [objects, setObjects] = useState<ReadonlySet<string>>(new Set());
  const selection = {
    pages: new Set(),
    objects,
    selectPages: () => {},
    selectObjects: (ids: string[]) => setObjects(new Set(ids)),
    clear: () => setObjects(new Set()),
  } as unknown as SelectionApi;
  const doc = {
    view: model.getView(),
    state: model.getState(),
    sources: { s0: { docId: 'r1', info: null } },
    currentPage: 'ckpt0:0',
    dispatch: (op: never, label?: string) => model.dispatch(op, label),
    announce: () => {},
    // No text layer here (it needs a canvas).
    text: () => new Promise(() => {}),
    pageGeom: () => ({ view: [0, 0, 612, 792], rotate: 0 }),
    render: {
      annotations: vi.fn(() => Promise.resolve([SQUARE])),
      renderWithoutAnnotations: () => new Promise(() => {}),
    },
  } as unknown as DocumentApi;
  return (
    <AnnotationsOverlay
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

describe('existing annotations on the object layer', () => {
  it('select, then a keyboard nudge writes annot.update with the new rect', async () => {
    const model = makeModel();
    render(<Harness model={model} />);
    const obj = await screen.findByRole('button', { name: /Square by Alice/ });
    act(() => {
      fireEvent.pointerDown(obj, { button: 0, pointerId: 1 });
      fireEvent.pointerUp(obj, { pointerId: 1 });
    });
    expect(getAnnotateUi().selectedExisting).toMatchObject({ ref: '12R' });
    act(() => {
      fireEvent.keyDown(obj, { key: 'ArrowRight', shiftKey: true });
      fireEvent.keyUp(obj, { key: 'ArrowRight', shiftKey: true });
    });
    const [op] = model.getState().log;
    expect(op).toMatchObject({
      type: 'annot.update',
      params: {
        target: { kind: 'existing', ref: '12R' },
        patch: { rect: { x: 110, y: 600, width: 50, height: 20 } },
      },
    });
  });

  it('Delete removes the existing annotation', async () => {
    const model = makeModel();
    render(<Harness model={model} />);
    const obj = await screen.findByRole('button', { name: /Square by Alice/ });
    act(() => {
      fireEvent.pointerDown(obj, { button: 0, pointerId: 1 });
      fireEvent.pointerUp(obj, { pointerId: 1 });
    });
    act(() => fireEvent.keyDown(obj, { key: 'Delete' }));
    const [op] = model.getState().log;
    expect(op).toMatchObject({
      type: 'annot.delete',
      params: { target: { kind: 'existing', ref: '12R' } },
    });
  });
});
