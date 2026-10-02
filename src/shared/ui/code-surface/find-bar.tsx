import React from 'react';
import { matchesHotkey } from '@/shared/lib/hotkeys';
import { Button, IconButton } from '../button';
import { IconChevronDown, IconChevronUp, IconX } from '../icons';
import { Input } from '../input';
import type { FindState } from './use-find';

/**
 * The find row of a CodeSurface: query, regex toggle, "3 of 17" count,
 * previous and next, close. Enter and Shift+Enter cycle, Escape closes
 * (the surface returns focus to the text).
 */
export function FindBar({
  find,
  caret,
  label,
  inputRef,
  onClose,
}: {
  find: FindState;
  /** Current caret offset, the anchor for a new query. */
  caret(): number;
  label: string;
  inputRef: React.Ref<HTMLInputElement>;
  onClose(): void;
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) find.previous();
      else find.next();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (matchesHotkey(e, 'Mod+F')) {
      e.preventDefault();
      e.currentTarget.select();
    }
  };
  const none = find.result.matches.length === 0;
  return (
    <div
      role="search"
      aria-label={`Find in ${label}`}
      className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-2 py-1.5"
    >
      <div className="min-w-40 flex-1">
        <Input
          ref={inputRef}
          value={find.query}
          onChange={(q) => find.setQuery(q, caret())}
          onKeyDown={onKeyDown}
          aria-label="Find"
          placeholder="Find"
          invalid={!!find.result.error}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <span
        aria-live="polite"
        className="min-w-20 font-mono-meta text-xs text-fg-muted"
      >
        {find.status}
      </span>
      <Button
        size="sm"
        variant="ghost"
        aria-pressed={find.regex}
        onClick={() => find.setRegex(!find.regex, caret())}
        className={find.regex ? 'bg-accent-soft text-accent-fg' : undefined}
      >
        Regex
      </Button>
      <IconButton
        size="sm"
        variant="ghost"
        label="Previous match"
        icon={IconChevronUp}
        disabled={none}
        onClick={find.previous}
      />
      <IconButton
        size="sm"
        variant="ghost"
        label="Next match"
        icon={IconChevronDown}
        disabled={none}
        onClick={find.next}
      />
      <IconButton
        size="sm"
        variant="ghost"
        label="Close find"
        icon={IconX}
        onClick={onClose}
      />
    </div>
  );
}
