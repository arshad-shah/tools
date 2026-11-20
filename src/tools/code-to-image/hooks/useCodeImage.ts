import { useEffect, useRef, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import {
  renderCodeImagePng,
  type CodeImageInput,
} from '@/shared/surfaces/code-image/render';

export interface CodeImagePreview {
  url: string;
  width: number;
  height: number;
}

interface State {
  preview: CodeImagePreview | null;
  error: ToolError | null;
  /** The input the state was drawn from. */
  from: CodeImageInput | null;
}

const DEBOUNCE_MS = 120;

/**
 * The live preview: renders `input` as a PNG shortly after it stops
 * changing. The previous image stays up until the next one is ready; each
 * object URL is revoked once replaced, and the last one on unmount.
 */
export function useCodeImage(input: CodeImageInput | null, scale: number) {
  const [state, setState] = useState<State>({
    preview: null,
    error: null,
    from: null,
  });
  const shown = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (shown.current) URL.revokeObjectURL(shown.current);
      shown.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!input) return;
    let live = true;
    const timer = setTimeout(() => {
      renderCodeImagePng(input, scale).then(
        ({ blob, layout }) => {
          if (!live) return;
          const url = URL.createObjectURL(blob);
          if (shown.current) URL.revokeObjectURL(shown.current);
          shown.current = url;
          setState({
            preview: { url, width: layout.width, height: layout.height },
            error: null,
            from: input,
          });
        },
        (e: unknown) => {
          if (live)
            setState((s) => ({
              preview: s.preview,
              error: toToolError(e, 'The image could not be drawn'),
              from: input,
            }));
        },
      );
    }, DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [input, scale]);

  if (!input) return { preview: null, error: null, busy: false };
  return {
    preview: state.preview,
    error: state.error,
    busy: state.from !== input,
  };
}
