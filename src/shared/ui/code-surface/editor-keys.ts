import type React from 'react';
import { matchesHotkey } from '@/shared/lib/hotkeys';
import type { LanguageId } from '@/shared/lib/syntax/tokenize';
import {
  autoPairEdit,
  isClosingChar,
  LINE_COMMENT,
  newlineEdit,
  outdentLines,
  tabEdit,
  toggleCommentEdit,
  type Edit,
} from './editing';

/**
 * Replaces `[start, end)` through the browser's editing commands when they
 * exist, so native undo and redo keep working; otherwise (jsdom, very old
 * engines) through setRangeText plus `emit`.
 */
export function applyEdit(
  ta: HTMLTextAreaElement,
  edit: Edit,
  emit: (value: string) => void,
): void {
  ta.focus();
  ta.setSelectionRange(edit.start, edit.end);
  let done = false;
  const doc = ta.ownerDocument as Document & {
    execCommand?: (cmd: string, ui?: boolean, value?: string) => boolean;
  };
  if (typeof doc.execCommand === 'function') {
    try {
      done = edit.text
        ? doc.execCommand('insertText', false, edit.text)
        : edit.start === edit.end || doc.execCommand('delete');
    } catch {
      done = false;
    }
  }
  if (!done) {
    ta.setRangeText(edit.text, edit.start, edit.end, 'end');
    emit(ta.value);
  }
  ta.setSelectionRange(edit.selStart, edit.selEnd);
}

export interface KeyContext {
  locked: boolean;
  singleLine: boolean;
  tabSize: number;
  language: LanguageId;
  apply(edit: Edit): void;
  openFind(): void;
  onSubmit?(): void;
  /**
   * Editor memory across keys: where an auto-inserted closing character
   * sits (typing it again steps over it) and whether Escape was just
   * pressed (the next Tab then moves focus instead of indenting).
   */
  memory: { pairAt: number; tabEscapes: boolean };
}

/** Handles editor keys on the textarea; returns true when it handled one. */
export function handleEditorKey(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  ctx: KeyContext,
): boolean {
  if (e.nativeEvent.isComposing) return false;
  const ta = e.currentTarget;
  const { value, selectionStart: s, selectionEnd: end } = ta;
  const mem = ctx.memory;
  const escaped = mem.tabEscapes;
  mem.tabEscapes = false;

  if (matchesHotkey(e, 'Mod+F')) {
    e.preventDefault();
    ctx.openFind();
    return true;
  }
  if (e.key === 'Escape') {
    mem.tabEscapes = true;
    return false;
  }
  if (e.key === 'Enter' && !e.altKey && !e.ctrlKey && !e.metaKey) {
    if (ctx.singleLine) {
      e.preventDefault();
      ctx.onSubmit?.();
      return true;
    }
    if (ctx.locked || e.shiftKey) return false;
    e.preventDefault();
    ctx.apply(newlineEdit(value, s, end, ctx.tabSize));
    return true;
  }
  if (ctx.locked) return false;

  if (e.key === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey) {
    if (ctx.singleLine || escaped) return false;
    e.preventDefault();
    const edit = e.shiftKey
      ? outdentLines(value, s, end, ctx.tabSize)
      : tabEdit(value, s, end, ctx.tabSize);
    if (edit) ctx.apply(edit);
    return true;
  }
  const comment = LINE_COMMENT[ctx.language];
  if (comment && !ctx.singleLine && matchesHotkey(e, 'Mod+/')) {
    e.preventDefault();
    ctx.apply(toggleCommentEdit(value, s, end, comment));
    return true;
  }
  if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) {
    if (e.key === 'Backspace' && s === end && mem.pairAt === s && s > 0) {
      e.preventDefault();
      mem.pairAt = -1;
      ctx.apply({
        start: s - 1,
        end: s + 1,
        text: '',
        selStart: s - 1,
        selEnd: s - 1,
      });
      return true;
    }
    if (!/^(Shift|Control|Alt|Meta)$/.test(e.key)) mem.pairAt = -1;
    return false;
  }
  if (
    isClosingChar(e.key) &&
    s === end &&
    mem.pairAt === s &&
    value[s] === e.key
  ) {
    e.preventDefault();
    mem.pairAt = -1;
    ta.setSelectionRange(s + 1, s + 1);
    return true;
  }
  const pair = autoPairEdit(value, s, end, e.key);
  if (pair) {
    e.preventDefault();
    ctx.apply(pair);
    mem.pairAt = pair.selStart;
    return true;
  }
  mem.pairAt = -1;
  return false;
}
