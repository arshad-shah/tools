/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { makeModel } from '@/pdf/doc/test-helpers';
import type { ExistingAnnotation } from '@/pdf/render/annotations';
import type { DocumentApi, ModeProps } from '../types';
import { CommentsPanel } from './CommentsPanel';
import { setAnnotateUi } from './ui-store';
import { saveEditor } from './save-editor';
import { getAnnotateUi } from './ui-store';

registerCoreOperations();

const EXISTING: ExistingAnnotation = {
  ref: '12R',
  subtype: 'Text',
  rect: { x: 400, y: 600, width: 20, height: 20 },
  color: '#ffff00',
  author: 'Alice',
  contents: 'Please check',
  modified: 'D:20250101120000Z',
  inReplyTo: null,
  quadPoints: null,
  editable: true,
  index: 0,
};

function setup() {
  const model = makeModel();
  const goToPage = vi.fn();
  const doc = () =>
    ({
      view: model.getView(),
      state: model.getState(),
      sources: { s0: { docId: 'r1', info: null } },
      currentPage: 'ckpt0:0',
      dispatch: (op: never) => model.dispatch(op),
      render: {
        annotations: vi.fn(async (_id: string, index: number) =>
          index === 0 ? [EXISTING] : [],
        ),
      },
      announce: () => {},
      goToPage,
    }) as unknown as DocumentApi;
  const props = (): ModeProps => ({
    doc: doc(),
    selection: {
      pages: new Set(),
      objects: new Set(),
      selectPages: () => {},
      selectObjects: () => {},
      clear: () => {},
    },
    tool: { id: null, set: () => {} },
    layout: 'standard',
  });
  const view = render(<CommentsPanel {...props()} />);
  const refresh = () => view.rerender(<CommentsPanel {...props()} />);
  return { model, refresh, goToPage };
}

const highlight = (author: string) => ({
  type: 'annot.markup',
  params: {
    id: `h-${author}`,
    pageId: 'ckpt0:1',
    subtype: 'Highlight',
    quads: [[72, 720, 200, 720, 72, 700, 200, 700]],
    color: '#ffd400',
    opacity: 1,
    author,
    contents: `${author} highlight`,
  },
});

describe('CommentsPanel', () => {
  beforeEach(() => setAnnotateUi({ editor: null }));

  it('lists existing and pending annotations and filters by author and type', async () => {
    const { model, refresh } = setup();
    act(() => {
      model.dispatch(highlight('Me'));
      model.dispatch(highlight('Bob'));
    });
    refresh();
    const list = await screen.findByRole('list', { name: 'Annotations' });
    await waitFor(() =>
      expect(within(list).getAllByTestId('comment-row')).toHaveLength(3),
    );
    expect(within(list).getByText('Please check')).toBeTruthy();

    fireEvent.change(
      screen.getByRole('combobox', { name: 'Filter by author' }),
      {
        target: { value: 'Bob' },
      },
    );
    expect(within(list).getAllByTestId('comment-row')).toHaveLength(1);
    expect(within(list).getByText('Bob highlight')).toBeTruthy();

    fireEvent.change(
      screen.getByRole('combobox', { name: 'Filter by author' }),
      {
        target: { value: '' },
      },
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by type' }), {
      target: { value: 'Note' },
    });
    expect(within(list).getAllByTestId('comment-row')).toHaveLength(1);
    expect(within(list).getByText('Please check')).toBeTruthy();
  });

  it('Reply on a note opens the editor, and saving dispatches annot.note with replyTo', async () => {
    const { model } = setup();
    const list = await screen.findByRole('list', { name: 'Annotations' });
    fireEvent.click(within(list).getByRole('button', { name: 'Reply' }));
    const editor = getAnnotateUi().editor!;
    expect(editor).toMatchObject({
      kind: 'reply',
      pageId: 'ckpt0:0',
      replyTo: { kind: 'existing', ref: '12R' },
    });
    const doc = {
      view: model.getView(),
      dispatch: (op: never) => model.dispatch(op),
    };
    saveEditor(doc as unknown as DocumentApi, editor, 'Done');
    const op = model.getState().log.at(-1)!;
    expect(op.type).toBe('annot.note');
    expect(op.params).toMatchObject({
      contents: 'Done',
      replyTo: { kind: 'existing', ref: '12R' },
      author: 'Me',
    });
    expect(getAnnotateUi().editor).toBeNull();
  });

  it('changing the name dispatches annot.author', async () => {
    const { model } = setup();
    const field = screen.getByRole('textbox', {
      name: 'Your name for comments',
    });
    fireEvent.change(field, { target: { value: 'Ann' } });
    fireEvent.blur(field);
    expect(model.getState().log.at(-1)).toMatchObject({
      type: 'annot.author',
      params: { name: 'Ann' },
    });
  });

  it('Delete on an existing annotation dispatches annot.delete with its position', async () => {
    const { model } = setup();
    const list = await screen.findByRole('list', { name: 'Annotations' });
    fireEvent.click(within(list).getByRole('button', { name: 'Delete' }));
    expect(model.getState().log.at(-1)).toMatchObject({
      type: 'annot.delete',
      params: {
        pageId: 'ckpt0:0',
        target: { kind: 'existing', ref: '12R', nm: null, index: 0 },
      },
    });
  });

  it('Go to navigates the canvas to the annotation and focuses its page', async () => {
    const { goToPage } = setup();
    const list = await screen.findByRole('list', { name: 'Annotations' });
    fireEvent.click(within(list).getByRole('button', { name: 'Go to' }));
    expect(goToPage).toHaveBeenCalledWith('ckpt0:0', {
      box: expect.objectContaining({ width: 1, height: 1 }),
      focus: true,
    });
  });
});
