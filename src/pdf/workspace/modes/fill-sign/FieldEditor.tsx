import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { IconAlertTriangle } from '@/shared/ui/icons';
import { DateInput, Input, Select, Text, Textarea } from '@/shared/ui';
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
}

/**
 * The inline editor inside a field (spec §8.5): a single-line Input, a
 * Textarea for multiline fields, a date input, or a choice list. Enter
 * commits, Esc cancels, Tab and Shift+Tab commit and move. A warning shows
 * when the text will not fit at 6pt.
 */
export function FieldEditor({
  field,
  onCommit,
  onCancel,
  onTab,
  onDraft,
  onSettings,
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

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (onSettings && e.altKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      e.stopPropagation();
      onSettings();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
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
      {tooLong ? (
        <Text size="xs" className="flex items-center gap-1 px-1 text-warning">
          <IconAlertTriangle size="xs" />
          Text is too long for this field
        </Text>
      ) : null}
    </div>
  );
}
