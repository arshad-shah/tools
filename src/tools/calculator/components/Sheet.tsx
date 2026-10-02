import React, { useEffect, useRef } from 'react';
import { Box, Stack, Text } from '@/shared/ui';
import { CodeSurface, type CodeSurfaceHandle } from '@/shared/ui/code-surface';
import type { SheetApi } from '../hooks/useSheet';

interface SheetProps {
  sheet: SheetApi;
}

/**
 * The expression sheet: one single-line editor per line with its live
 * result right-aligned (or the line's error). Enter records the line and
 * moves to a new one; keypad edits put the caret back where they ended.
 */
export const Sheet: React.FC<SheetProps> = ({ sheet }) => {
  const handles = useRef<(CodeSurfaceHandle | null)[]>([]);
  const focusNext = useRef(false);
  const { caretRequest, activeLine } = sheet;

  useEffect(() => {
    if (!caretRequest) return;
    const h = handles.current[caretRequest.line];
    h?.setSelection(caretRequest.pos, caretRequest.pos, { scroll: false });
    if (focusNext.current) {
      focusNext.current = false;
      h?.focus();
    }
  }, [caretRequest]);

  return (
    <Stack gap="2" aria-label="Expression sheet" role="group">
      {sheet.lines.map((line, i) => {
        const result = sheet.results[i];
        return (
          <Box
            key={i}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
            onFocus={() => sheet.setActiveLine(i)}
            data-active={i === activeLine || undefined}
          >
            <CodeSurface
              ref={(h) => {
                handles.current[i] = h;
              }}
              value={line}
              onChange={(text) => sheet.setLine(i, text)}
              onSelectionChange={(start, end) => sheet.select(i, start, end)}
              onSubmit={() => {
                focusNext.current = true;
                sheet.evaluateActive();
              }}
              language="plain"
              label={`Line ${i + 1}`}
              placeholder={
                i === 0 ? 'Type an expression, e.g. 5 km to mi' : undefined
              }
              singleLine
              className={i === activeLine ? 'border-accent' : undefined}
            />
            <Box
              className="min-w-16 max-w-[45%] text-right"
              data-testid={`result-${i + 1}`}
            >
              {result && !result.ok ? (
                <Text size="xs" className="text-danger break-words">
                  {result.error}
                </Text>
              ) : (
                <Text mono weight="semibold" className="break-all tabular-nums">
                  {result?.text ?? ''}
                </Text>
              )}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
};
