import {
  Button,
  Inline,
  Popover,
  Stack,
  TextArea,
} from '@arshad-shah/cynosure';
import { useState } from 'react';
import type { EditorState } from './ui-store';

export interface NoteEditorProps {
  editor: EditorState;
  /** Screen rect the popover points at. */
  anchor: () => DOMRect;
  onSave(text: string): void;
  onCancel(): void;
}

const TITLES: Record<EditorState['kind'], string> = {
  note: 'New note',
  reply: 'Reply',
  freetext: 'Text comment',
  edit: 'Edit comment',
};

/** The text editor for a note, a reply, a text comment or an edit. */
export function NoteEditor({
  editor,
  anchor,
  onSave,
  onCancel,
}: NoteEditorProps) {
  const [text, setText] = useState(editor.kind === 'edit' ? editor.text : '');
  const empty = text.trim() === '';
  const save = () => {
    if (!empty) onSave(text);
  };
  return (
    <Popover
      open
      onOpenChange={(open) => !open && onCancel()}
      anchor={{ getBoundingClientRect: anchor }}
      label={TITLES[editor.kind]}
      initialFocus="first"
      modal
      size="sm"
    >
      <Stack gap="3">
        <TextArea
          label={TITLES[editor.kind]}
          labelHidden
          value={text}
          onChange={setText}
          rows={4}
          description="Ctrl Enter saves."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              save();
            }
          }}
        />
        <Inline gap="2" justify="end">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="solid"
            tone="accent"
            size="sm"
            disabled={empty}
            onClick={save}
          >
            Save
          </Button>
        </Inline>
      </Stack>
    </Popover>
  );
}
