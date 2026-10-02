import { useRef, useState } from 'react';
import { Button, Popover, Stack, Textarea } from '@/shared/ui';
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
  const field = useRef<HTMLTextAreaElement>(null);
  const empty = text.trim() === '';
  return (
    <Popover
      open
      onOpenChange={(open) => !open && onCancel()}
      anchor={{ getBoundingClientRect: anchor }}
      label={TITLES[editor.kind]}
      initialFocus={field}
      modal
    >
      <form
        className="w-72 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!empty) onSave(text);
        }}
      >
        <Stack gap="2">
          <Textarea
            ref={field}
            aria-label={TITLES[editor.kind]}
            value={text}
            onChange={setText}
            rows={4}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (!empty) onSave(text);
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={empty}>
              Save
            </Button>
          </div>
        </Stack>
      </form>
    </Popover>
  );
}
