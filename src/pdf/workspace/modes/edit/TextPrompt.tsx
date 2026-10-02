import { useRef, useState } from 'react';
import { Button, Popover, Stack, Text, Textarea } from '@/shared/ui';
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
  const field = useRef<HTMLTextAreaElement>(null);
  const cover = prompt.kind === 'cover';
  const label = cover ? 'Replacement text' : 'Text';
  const empty = text.trim() === '';
  return (
    <Popover
      open
      onOpenChange={(open) => !open && onCancel()}
      anchor={{ getBoundingClientRect: anchor }}
      label={cover ? 'Cover and replace' : 'Add text'}
      initialFocus={field}
      modal
    >
      <form
        className="w-72 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (cover || !empty) onSave(text);
        }}
      >
        <Stack gap="2">
          {cover ? (
            <Text size="xs" tone="muted">
              {COVER_COPY}
            </Text>
          ) : null}
          <Textarea
            ref={field}
            aria-label={label}
            value={text}
            onChange={setText}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (cover || !empty) onSave(text);
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={!cover && empty}
            >
              {cover ? 'Cover' : 'Add text'}
            </Button>
          </div>
        </Stack>
      </form>
    </Popover>
  );
}
