import type { DocumentApi } from '../types';
import { addAnnotation } from './tools';
import { setAnnotateUi, type EditorState } from './ui-store';

/** Dispatches what the note editor was opened for, then closes it. */
export function saveEditor(
  doc: DocumentApi,
  editor: EditorState,
  text: string,
): void {
  switch (editor.kind) {
    case 'note':
      addAnnotation(doc, 'annot.note', {
        pageId: editor.pageId,
        at: editor.at,
        icon: 'Comment',
        contents: text,
      });
      break;
    case 'reply':
      addAnnotation(doc, 'annot.note', {
        pageId: editor.pageId,
        at: editor.at,
        icon: 'Note',
        contents: text,
        replyTo: editor.replyTo,
      });
      break;
    case 'freetext':
      addAnnotation(doc, 'annot.freetext', {
        pageId: editor.pageId,
        rect: editor.rect,
        text,
        fontSize: 12,
        align: 'left',
        border: true,
      });
      break;
    case 'edit':
      doc.dispatch({
        type: 'annot.update',
        params: {
          pageId: editor.pageId,
          target: editor.target,
          patch: { contents: text },
        },
      });
      break;
  }
  setAnnotateUi({ editor: null });
}
