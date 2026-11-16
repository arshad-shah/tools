import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { warning as warningIcon } from '@arshad-shah/cynosure/icons';
import {
  Card,
  DateField,
  Inline,
  Icon,
  Select,
  Stack,
  Text,
  TextArea,
  TextField,
} from '@arshad-shah/cynosure';
import { PageTextInput } from '@/shared/ui';
import { Below, Layer } from '@/pdf/surfaces/layers';
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
  inline?: { fontPx: number; spacingPx: number; cellPx?: number };
  /** Esc keeps the text (commits) instead of discarding the edit. */
  escapeKeeps?: boolean;
  /** Esc with escapeKeeps: default onCommit. */
  onEscape?(value: string): void;
  /** Changes when the text bar's Done is pressed: keep the text and close. */
  finishNonce?: number;
  /** Done: default onCommit. */
  onFinish?(value: string): void;
  /**
   * The editor closed with the text changed but not committed (another
   * field or spot clicked, the mode left, the page scrolled out of view):
   * keep what was typed. Called on unmount, so it must not change which
   * editor is open.
   */
  onLeave?(value: string): void;
}

/**
 * The inline editor inside a field (spec §8.5): a single-line Input, a
 * Textarea for multiline fields, a date input, or a choice list. Enter
 * commits, Esc cancels (or keeps the text, with escapeKeeps), Tab and
 * Shift+Tab commit and move; closing it any other way keeps the text
 * (onLeave). A warning shows when the text will not fit at 6pt.
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
  onLeave,
}: FieldEditorProps) {
  const [initial] = useState(() =>
    field.type === 'date' ? displayToIso(field.value) : field.value,
  );
  const [value, setRaw] = useState(initial);
  const wrap = useRef<HTMLDivElement>(null);
  // A dropdown opens its list straight away: one click to choose, as in a
  // PDF viewer, not a second click on a small select box.
  useEffect(() => {
    wrap.current
      ?.querySelector<HTMLElement>('[role="combobox"][aria-haspopup="listbox"]')
      ?.click();
  }, []);
  // Enter, Tab, Esc or Done settled the edit; otherwise unmounting keeps it.
  const settled = useRef(false);
  // A form field's /MaxLen: typing stops there, as in a PDF viewer.
  const limit = field.widget?.maxLength ?? null;
  const setValue = (typed: string) => {
    const v = limit ? Array.from(typed).slice(0, limit).join('') : typed;
    settled.current = false;
    setRaw(v);
    onDraft?.(field.type === 'date' ? isoToDisplay(v) : v);
  };
  const out = () => (field.type === 'date' ? isoToDisplay(value) : value);

  const settle =
    <A extends unknown[]>(f: (...a: A) => void) =>
    (...a: A) => {
      settled.current = true;
      f(...a);
    };
  const leave = useRef<() => void>(() => {});
  useEffect(() => {
    leave.current = () => {
      if (!settled.current && value !== initial) onLeave?.(out());
    };
  });
  useEffect(() => () => leave.current(), []);

  useEffect(() => {
    wrap.current
      ?.querySelector<HTMLElement>('input, textarea, select')
      ?.focus();
  }, []);

  // Done in the text bar: the nonce it opened with is not a request.
  const [openedAt] = useState(finishNonce);
  const finish = useRef<() => void>(() => {});
  useEffect(() => {
    finish.current = settle(() => (onFinish ?? onCommit)(out()));
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
      if (escapeKeeps) settle(onEscape ?? onCommit)(out());
      else settle(onCancel)();
    } else if (
      e.key === 'Enter' &&
      !(field.type === 'multiline' && e.shiftKey)
    ) {
      e.preventDefault();
      e.stopPropagation();
      settle(onCommit)(out());
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      settle(onTab)(out(), e.shiftKey ? -1 : 1);
    }
  };

  const tooLong =
    (field.type === 'text' || field.type === 'multiline') &&
    !fitsBox(value, field.rect, field.type === 'multiline');
  const name = field.label ?? 'Field';
  const warning = tooLong ? (
    <Inline gap="1" align="center">
      <Icon icon={warningIcon} size="sm" tone="warning" />
      <Text size="xs" tone="warning">
        Text is too long for this field
      </Text>
    </Inline>
  ) : null;
  if (inline && field.type === 'text')
    return (
      <Layer ref={wrap} onKeyDown={onKeyDown}>
        <PageTextInput
          aria-label={name}
          aria-keyshortcuts={onSettings ? 'Alt+T' : undefined}
          value={value}
          onChange={setValue}
          fontPx={inline.fontPx}
          spacingPx={inline.spacingPx}
          cellPx={inline.cellPx}
        />
        {warning ? (
          <Below minWidth={0}>
            <Card padding="sm">{warning}</Card>
          </Below>
        ) : null}
      </Layer>
    );
  return (
    <Below
      ref={wrap}
      onKeyDown={onKeyDown}
      minWidth={field.type === 'choice' ? 200 : undefined}
    >
      <Card padding="sm">
        <Stack gap="2">
          {field.type === 'multiline' ? (
            <TextArea
              label={name}
              labelHidden
              value={value}
              onChange={setValue}
              rows={3}
            />
          ) : field.type === 'date' ? (
            <DateField
              label={name}
              labelHidden
              size="sm"
              value={value || null}
              onChange={(d) => setValue(d ?? '')}
            />
          ) : field.type === 'choice' ? (
            <Select
              label={name}
              labelHidden
              size="sm"
              value={value}
              options={(field.widget?.options ?? []).map((o) => ({
                value: o,
                // Forms often start on a blank " " option.
                label: o.trim() ? o : '(none)',
              }))}
              onChange={setValue}
            />
          ) : (
            <TextField
              label={name}
              labelHidden
              size="sm"
              aria-keyshortcuts={onSettings ? 'Alt+T' : undefined}
              value={value}
              onChange={setValue}
            />
          )}
          {warning}
        </Stack>
      </Card>
    </Below>
  );
}
