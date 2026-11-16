import { Grid, Stack, Text, TextField } from '@arshad-shah/cynosure';
import React, { useEffect, useRef } from 'react';
import type { SheetApi } from '../hooks/useSheet';

interface SheetProps {
  sheet: SheetApi;
}

/**
 * The expression sheet: one field per line with its live result beside it
 * (or the line's error). Enter records the line and moves to a new one;
 * keypad edits put the caret back where they ended.
 */
export const Sheet: React.FC<SheetProps> = ({ sheet }) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const focusNext = useRef(false);
  const { caretRequest, activeLine } = sheet;

  useEffect(() => {
    if (!caretRequest) return;
    const el = inputs.current[caretRequest.line];
    if (!el) return;
    if (focusNext.current) {
      focusNext.current = false;
      el.focus();
    }
    el.setSelectionRange(caretRequest.pos, caretRequest.pos);
  }, [caretRequest]);

  const report = (i: number, el: HTMLInputElement) =>
    sheet.select(i, el.selectionStart ?? 0, el.selectionEnd ?? 0);

  return (
    <Stack gap="3" role="group" aria-label="Expression sheet">
      {sheet.lines.map((line, i) => {
        const result = sheet.results[i];
        const active = i === activeLine;
        return (
          <Grid
            key={i}
            columns="minmax(0, 3fr) minmax(0, 2fr)"
            gap="3"
            align="center"
          >
            <TextField
              ref={(el) => {
                inputs.current[i] = el;
              }}
              label={`Line ${i + 1}`}
              labelHidden
              variant={active ? 'outline' : 'soft'}
              size="lg"
              value={line}
              spellCheck={false}
              autoComplete="off"
              placeholder={
                i === 0 ? 'Type an expression, e.g. 5 km to mi' : undefined
              }
              onChange={(text) => sheet.setLine(i, text)}
              onFocus={() => sheet.setActiveLine(i)}
              onSelect={(e) => report(i, e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                focusNext.current = true;
                sheet.evaluateActive();
              }}
            />
            <Stack align="end" data-testid={`result-${i + 1}`}>
              {result && !result.ok ? (
                <Text size="sm" tone="danger" align="end" wrap="break">
                  {result.error}
                </Text>
              ) : (
                <Text
                  size="lg"
                  weight="bold"
                  numeric
                  align="end"
                  wrap="break"
                  tone={active ? 'inherit' : 'muted'}
                >
                  {result?.text ?? ''}
                </Text>
              )}
            </Stack>
          </Grid>
        );
      })}
    </Stack>
  );
};
