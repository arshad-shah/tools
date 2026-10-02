import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormatRef } from '../lib/model';
import type { LogSource } from './useLogSource';

export type LogInput =
  | { kind: 'text'; text: string }
  | { kind: 'file'; file: File };

export const TEXT_DEBOUNCE_MS = 150;

/**
 * What the viewer shows: pasted text (parsed 150 ms after typing stops) or
 * a File streamed to the worker (never read into the editor). A new input
 * or format re-opens the log; no input resets it.
 */
export function useLogInput(source: LogSource, format: FormatRef) {
  const [input, setInputState] = useState<LogInput | null>(null);
  const formatKey = JSON.stringify(format);
  const live = useRef({ source, format });
  useEffect(() => {
    live.current = { source, format };
  });

  useEffect(() => {
    if (!input) return;
    const t = setTimeout(
      () => {
        const { source: s, format: f } = live.current;
        void s.open(
          input.kind === 'file' ? { file: input.file } : { text: input.text },
          f,
        );
      },
      input.kind === 'text' ? TEXT_DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(t);
  }, [input, formatKey]);

  const setInput = useCallback((next: LogInput | null) => {
    setInputState(next);
    if (!next) live.current.source.reset();
  }, []);

  const openFile = useCallback(
    (file: File | undefined) => {
      if (file) setInput({ kind: 'file', file });
    },
    [setInput],
  );

  return { input, setInput, openFile };
}
