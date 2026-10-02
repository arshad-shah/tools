import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { IconAlertTriangle } from '@/shared/ui/icons';
import {
  DateInput,
  Input,
  PageTextInput,
  Select,
  Text,
  Textarea,
} from '@/shared/ui';
import type { ViewField } from './fields';
import { displayToIso, isoToDisplay } from './dates';
import { fitsBox } from './text-measure';

export interface FieldEditorProps {
  field: ViewField;
  onCommit(value: string): void;
  onCancel(): void;
  /** Tab / Shift+Tab: commit, then move. */
  onTab(value: string, dir: 1 | -1): void;
  /** Every keystroke (the page shows the text live). */
  onDraft?(value: string): void;
  /** Alt+T: to the text settings bar. */
  onSettings?(): void;
  /**
   * Single-line text typed straight onto the page: a transparent caret
   * over the box at the text's on-screen size, the page showing through
   * (the value is drawn in place by FieldValue).
   */
  inline?: { fontPx: number; spacingPx: number };
  /** Esc keeps the text (commits) instead of discarding the edit. */
  escapeKeeps?: boolean;
  /** Esc with escapeKeeps: default onCommit. */
  onEscape?(value: string): void;
  /** Changes when the text bar's Done is pressed: keep the text and close. */
  finishNonce?: number;
  /** Done: default onCommit. */
  onFinish?(value: string): void;
}

/**
 * The inline editor inside a field (spec §8.5): a single-line Input, a
 * Textarea for multiline fields, a date input, or a choice list. Enter
 * commits, Esc cancels (or keeps the text, with escapeKeeps), Tab and
 * Shift+Tab commit and move. A warning shows
 * when the text will not fit at 6pt.
 */
export function FieldEditor({
  field,
  onCommit,
  onCancel,
  onTab,
  onDraft,
  onSettings,
  inline,
  escapeKeeps = false,
  onEscape,
  finishNonce,
  onFinish,
}: FieldEditorProps) {
  const [value, setRaw] = useState(
    field.type === 'date' ? displayToIso(field.value) : field.value,
  );
  const wrap = useRef<HTMLDivElement>(null);
  const setValue = (v: string) => {
    setRaw(v);
    onDraft?.(field.type === 'date' ? isoToDisplay(v) : v);
  };
  const out = () => (field.type === 'date' ? isoToDisplay(value) : value);

  useEffect(() => {
    wrap.current
      ?.querySelector<HTMLElement>('input, textarea, select')
      ?.focus();
  }, []);

  // Done in the text bar: the nonce it opened with is not a request.
  const [openedAt] = useState(finishNonce);
  const finish = useRef<() => void>(() => {});
  useEffect(() => {
    finish.current = () => (onFinish ?? onCommit)(out());
  });
  useEffect(() => {
    if (finishNonce !== undefined && finishNonce !== openedAt) finish.current();
  }, [finishNonce, openedAt]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (onSettings && e.altKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      e.stopPropagation();
      onSettings();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (escapeKeeps) (onEscape ?? onCommit)(out());
      else onCancel();
    } else if (
      e.key === 'Enter' &&
      !(field.type === 'multiline' && e.shiftKey)
    ) {
      e.preventDefault();
      e.stopPropagation();
      onCommit(out());
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      onTab(out(), e.shiftKey ? -1 : 1);
    }
  };

  const tooLong =
    (field.type === 'text' || field.type === 'multiline') &&
    !fitsBox(value, field.rect, field.type === 'multiline');
  const name = field.label ?? 'Field';
  const warning = tooLong ? (
    <Text size="xs" className="flex items-center gap-1 px-1 text-warning">
      <IconAlertTriangle size="xs" />
      Text is too long for this field
    </Text>
  ) : null;
  if (inline && field.type === 'text')
    return (
      <div ref={wrap} onKeyDown={onKeyDown} className="absolute inset-0">
        <PageTextInput
          aria-label={name}
          aria-keyshortcuts={onSettings ? 'Alt+T' : undefined}
          value={value}
          onChange={setValue}
          fontPx={inline.fontPx}
          spacingPx={inline.spacingPx}
        />
        {warning ? (
          <div className="absolute top-full left-0 mt-1 w-max max-w-[60vw] rounded-md bg-surface shadow-e2">
            {warning}
          </div>
        ) : null}
      </div>
    );
  return (
    <div
      ref={wrap}
      onKeyDown={onKeyDown}
      className="absolute top-full left-0 z-10 mt-1 flex min-w-full flex-col gap-1 rounded-md bg-surface p-0.5 shadow-e3"
    >
      {field.type === 'multiline' ? (
        <Textarea
          aria-label={name}
          value={value}
          onChange={setValue}
          rows={3}
        />
      ) : field.type === 'date' ? (
        <DateInput label={name} value={value} onChange={setValue} />
      ) : field.type === 'choice' ? (
        <Select
          aria-label={name}
          value={value}
          items={(field.widget?.options ?? []).map((o) => ({
            value: o,
            label: o,
          }))}
          onValueChange={setValue}
        />
      ) : (
        <Input
          aria-label={name}
          aria-keyshortcuts={onSettings ? 'Alt+T' : undefined}
          value={value}
          onChange={setValue}
        />
      )}
      {warning}
    </div>
  );
}
