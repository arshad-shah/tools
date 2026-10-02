import { useEffect, useState } from 'react';
import { renderMarkdown, type RenderResult } from '../lib/render';

export const RENDER_DELAY_MS = 150;

const EMPTY: RenderResult = { html: '', remoteImages: 0, outline: [] };

/** The rendered Markdown, debounced; a newer text discards older renders. */
export function useRendered(md: string, delay = RENDER_DELAY_MS): RenderResult {
  const [result, setResult] = useState<RenderResult>(EMPTY);
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      renderMarkdown(md).then(
        (r) => {
          if (live) setResult(r);
        },
        () => {
          // Keep the last good preview; the source is still editable.
        },
      );
    }, delay);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [md, delay]);
  return result;
}
