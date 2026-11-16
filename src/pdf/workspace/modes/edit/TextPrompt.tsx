import {
  Button,
  Inline,
  Popover,
  Stack,
  Text,
  TextArea,
} from '@arshad-shah/cynosure';
import { useState } from 'react';
import type { TextPrompt as Prompt } from './ui-store';

export const COVER_COPY =
  'This covers the original text. The original is still in the file and can be copied or found by search. To remove text, use Redact.';

/** Asks for the words of a new text box or a cover's replacement text. */
export function TextPrompt({
  prompt,
  anchor,
  onSave,
  onCancel,
}: {
  prompt: Prompt;
  anchor: () => DOMRect;
  onSave(text: string): void;
  onCancel(): void;
}) {
  const [text, setText] = useState('');
  const cover = prompt.kind === 'cover';
  const label = cover ? 'Replacement text' : 'Text';
  const empty = text.trim() === '';
  const save = () => {
    if (cover || !empty) onSave(text);
  };
  return (
    <Popover
      open
      onOpenChange={(open) => !open && onCancel()}
      anchor={{ getBoundingClientRect: anchor }}
      label={cover ? 'Cover and replace' : 'Add text'}
      initialFocus="first"
      modal
      size="sm"
    >
      <Stack gap="3">
        {cover ? (
          <Text as="p" size="sm" tone="muted">
            {COVER_COPY}
          </Text>
        ) : null}
        <TextArea
          label={label}
          labelHidden
          value={text}
          onChange={setText}
          rows={3}
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
            disabled={!cover && empty}
            onClick={save}
          >
            {cover ? 'Cover' : 'Add text'}
          </Button>
        </Inline>
      </Stack>
    </Popover>
  );
}
