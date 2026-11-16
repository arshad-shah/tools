/**
 * Test helpers for code editors (imported by tests only). `el` is the
 * editor's textbox, as `getByRole('textbox', { name })` finds it.
 */
import { act } from '@testing-library/react';
import { EditorView } from '@codemirror/view';

export function editorView(el: HTMLElement): EditorView {
  const view = EditorView.findFromDOM(el);
  if (!view) throw new Error('Not a code editor');
  return view;
}

/** The editor's text. */
export const editorValue = (el: HTMLElement) =>
  editorView(el).state.doc.toString();

/** The main selection as `[from, to]`. */
export function editorSelection(el: HTMLElement): [number, number] {
  const m = editorView(el).state.selection.main;
  return [m.from, m.to];
}

export function selectInEditor(el: HTMLElement, from: number, to = from) {
  const view = editorView(el);
  act(() => view.dispatch({ selection: { anchor: from, head: to } }));
}

/** Types `text` over the selection, as a keystroke or paste would. */
export function typeInEditor(el: HTMLElement, text: string) {
  const view = editorView(el);
  act(() =>
    view.dispatch({
      ...view.state.replaceSelection(text),
      userEvent: 'input.type',
    }),
  );
}

/** Replaces all the text, as select-all then paste would. */
export function setEditorValue(el: HTMLElement, text: string) {
  const view = editorView(el);
  act(() =>
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
      selection: { anchor: text.length },
      userEvent: 'input.paste',
    }),
  );
}
