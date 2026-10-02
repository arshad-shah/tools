/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SheetOptions } from '../lib/engine';
import { calculatorSettings, HISTORY_CAP } from '../settings';
import { useSheet } from './useSheet';

const OPTIONS: SheetOptions = {
  angle: 'deg',
  precision: 14,
  bigNumber: false,
  notation: { thousands: false, sciAbove: 21 },
};

const resetSettings = () => {
  const { result, unmount } = renderHook(() =>
    calculatorSettings.useSettings(),
  );
  act(() => result.current[2]());
  unmount();
};

const setup = (initial?: string[]) =>
  renderHook(() => useSheet(OPTIONS, initial)).result;

describe('useSheet', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSettings();
  });

  it('inserts at the caret of the active line', () => {
    const sheet = setup(['12+3']);
    act(() => sheet.current.select(0, 2, 2));
    act(() => sheet.current.insert('9'));
    expect(sheet.current.lines).toEqual(['129+3']);
    expect(sheet.current.caretRequest).toMatchObject({ line: 0, pos: 3 });
    act(() => sheet.current.insert('*'));
    expect(sheet.current.lines).toEqual(['129*+3']);
  });

  it('replaces a selection and appends when there is no caret yet', () => {
    const sheet = setup(['1+2']);
    act(() => sheet.current.insert('0'));
    expect(sheet.current.lines).toEqual(['1+20']);
    act(() => sheet.current.select(0, 0, 2));
    act(() => sheet.current.insert('5'));
    expect(sheet.current.lines).toEqual(['520']);
  });

  it('inserts into the line made active', () => {
    const sheet = setup(['1', '2']);
    act(() => sheet.current.setActiveLine(1));
    act(() => sheet.current.insert('+1'));
    expect(sheet.current.lines).toEqual(['1', '2+1']);
    expect(sheet.current.results[1]).toMatchObject({ ok: true, text: '3' });
  });

  it('evaluates the active line into history and opens a new line', () => {
    const sheet = setup();
    act(() => sheet.current.insert('7*6'));
    act(() => {
      sheet.current.evaluateActive();
    });
    expect(sheet.current.lines).toEqual(['7*6', '']);
    expect(sheet.current.activeLine).toBe(1);
    const { history } = calculatorSettings.getSettings();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ expression: '7*6', result: '42' });
  });

  it('caps history at 500, dropping the oldest', () => {
    const { result } = renderHook(() => calculatorSettings.useSettings());
    act(() =>
      result.current[1]({
        history: Array.from({ length: HISTORY_CAP }, (_, i) => ({
          expression: String(i),
          result: String(i),
          at: '',
        })),
      }),
    );
    const sheet = setup(['1+1']);
    act(() => {
      sheet.current.evaluateActive();
    });
    const { history } = calculatorSettings.getSettings();
    expect(history).toHaveLength(HISTORY_CAP);
    expect(history[0].expression).toBe('1');
    expect(history[HISTORY_CAP - 1]).toMatchObject({
      expression: '1+1',
      result: '2',
    });
  });

  it('keeps errors out of history', () => {
    const sheet = setup(['2 +']);
    act(() => {
      sheet.current.evaluateActive();
    });
    expect(calculatorSettings.getSettings().history).toEqual([]);
  });

  it('backspaces before the caret, then joins an empty line upwards', () => {
    const sheet = setup(['12', '']);
    act(() => sheet.current.select(0, 1, 1));
    act(() => sheet.current.backspace());
    expect(sheet.current.lines).toEqual(['2', '']);
    act(() => sheet.current.setActiveLine(1));
    act(() => sheet.current.backspace());
    expect(sheet.current.lines).toEqual(['2']);
    expect(sheet.current.activeLine).toBe(0);
  });

  it('clears the active line and the whole sheet', () => {
    const sheet = setup(['1', '2']);
    act(() => sheet.current.setActiveLine(1));
    act(() => sheet.current.clearActive());
    expect(sheet.current.lines).toEqual(['1', '']);
    act(() => sheet.current.clearAll());
    expect(sheet.current.lines).toEqual(['']);
    expect(sheet.current.activeLine).toBe(0);
  });
});
