import { useMemo, useRef, useState } from 'react';
import {
  evaluateSheet,
  type LineResult,
  type SheetOptions,
} from '../lib/engine';
import { calculatorSettings, HISTORY_CAP } from '../settings';

/** Where the Sheet should put the caret after a keypad edit. */
export interface CaretRequest {
  line: number;
  pos: number;
  /** Changes on every request, so the same position can be asked twice. */
  seq: number;
}

export interface SheetApi {
  lines: string[];
  results: LineResult[];
  setLine(index: number, text: string): void;
  /** Replaces the whole sheet (share links), the first line active. */
  setLines(lines: string[]): void;
  activeLine: number;
  setActiveLine(index: number): void;
  /** The caret or selection of a line, as the editor reports it. */
  select(line: number, start: number, end: number): void;
  caretRequest: CaretRequest | null;
  insert(token: string): void;
  /** Records the active line in history and moves to a new line below. */
  evaluateActive(): LineResult | undefined;
  clearActive(): void;
  clearAll(): void;
  backspace(): void;
}

type Selection = { line: number; start: number; end: number };

const replaceAt = (lines: string[], i: number, text: string) =>
  lines.map((l, j) => (j === i ? text : l));

/**
 * The expression sheet's state (spec §8.5, D12): its lines, the active line
 * and the caret there, so keypad tokens go where the user is editing.
 * Results are live; `evaluateActive` only records the line in history
 * (capped at HISTORY_CAP, the oldest dropped) and opens the next line.
 * Lines and the active index are mirrored in refs so several edits in one
 * tick (fast typing) build on each other.
 */
export function useSheet(
  options: SheetOptions,
  initial: string[] = [''],
): SheetApi {
  const [lines, setLinesState] = useState<string[]>(() =>
    initial.length > 0 ? initial : [''],
  );
  const [activeLine, setActiveState] = useState(0);
  const [caretRequest, setCaretRequest] = useState<CaretRequest | null>(null);
  const linesRef = useRef(lines);
  const activeRef = useRef(0);
  const selection = useRef<Selection | null>(null);
  const seq = useRef(0);
  const [, updateSettings] = calculatorSettings.useSettings();

  const { angle, precision, bigNumber, notation } = options;
  const { thousands, sciAbove } = notation;
  const results = useMemo(
    () =>
      evaluateSheet(lines, {
        angle,
        precision,
        bigNumber,
        notation: { thousands, sciAbove },
      }).results,
    [lines, angle, precision, bigNumber, thousands, sciAbove],
  );

  const commit = (next: string[]) => {
    linesRef.current = next;
    setLinesState(next);
  };
  const activate = (i: number) => {
    activeRef.current = i;
    setActiveState(i);
  };
  const moveCaret = (line: number, pos: number) => {
    selection.current = { line, start: pos, end: pos };
    setCaretRequest({ line, pos, seq: ++seq.current });
  };
  const rangeOf = (i: number, text: string) => {
    const s = selection.current;
    if (!s || s.line !== i) return { start: text.length, end: text.length };
    const start = Math.min(s.start, s.end, text.length);
    const end = Math.min(Math.max(s.start, s.end), text.length);
    return { start, end };
  };

  const setLine = (index: number, text: string) => {
    commit(replaceAt(linesRef.current, index, text));
    // The editor reports the new caret right after; until then, the end.
    if (selection.current?.line === index) selection.current = null;
  };

  const setLines = (next: string[]) => {
    commit(next.length > 0 ? next : ['']);
    selection.current = null;
    activate(0);
  };

  const setActiveLine = (index: number) => {
    if (index === activeRef.current) return;
    activate(Math.max(0, Math.min(index, linesRef.current.length - 1)));
  };

  const select = (line: number, start: number, end: number) => {
    selection.current = { line, start, end };
  };

  const insert = (token: string) => {
    const i = activeRef.current;
    const text = linesRef.current[i] ?? '';
    const { start, end } = rangeOf(i, text);
    commit(
      replaceAt(
        linesRef.current,
        i,
        text.slice(0, start) + token + text.slice(end),
      ),
    );
    moveCaret(i, start + token.length);
  };

  const backspace = () => {
    const i = activeRef.current;
    const text = linesRef.current[i] ?? '';
    const { start, end } = rangeOf(i, text);
    if (start !== end) {
      commit(
        replaceAt(linesRef.current, i, text.slice(0, start) + text.slice(end)),
      );
      moveCaret(i, start);
    } else if (start > 0) {
      commit(
        replaceAt(
          linesRef.current,
          i,
          text.slice(0, start - 1) + text.slice(start),
        ),
      );
      moveCaret(i, start - 1);
    } else if (text === '' && i > 0) {
      const next = linesRef.current.filter((_, j) => j !== i);
      commit(next);
      activate(i - 1);
      moveCaret(i - 1, next[i - 1].length);
    }
  };

  const evaluateActive = () => {
    const i = activeRef.current;
    const current = linesRef.current;
    const text = current[i] ?? '';
    if (text.trim() === '') return undefined;
    const result = evaluateSheet(current.slice(0, i + 1), options).results[i];
    if (result?.ok && result.text !== '') {
      const { history } = calculatorSettings.getSettings();
      updateSettings({
        history: [
          ...history,
          {
            expression: text.trim(),
            result: result.text,
            at: new Date().toISOString(),
          },
        ].slice(-HISTORY_CAP),
      });
    }
    const next =
      current[i + 1] === ''
        ? current
        : [...current.slice(0, i + 1), '', ...current.slice(i + 1)];
    commit(next);
    activate(i + 1);
    moveCaret(i + 1, 0);
    return result;
  };

  const clearActive = () => {
    const i = activeRef.current;
    commit(replaceAt(linesRef.current, i, ''));
    moveCaret(i, 0);
  };

  const clearAll = () => {
    commit(['']);
    activate(0);
    moveCaret(0, 0);
  };

  return {
    lines,
    results,
    setLine,
    setLines,
    activeLine,
    setActiveLine,
    select,
    caretRequest,
    insert,
    evaluateActive,
    clearActive,
    clearAll,
    backspace,
  };
}
