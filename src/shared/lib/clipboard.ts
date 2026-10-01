import { useCallback, useEffect, useRef, useState } from 'react';
import { ToolError } from './errors';
import { notify } from './notify';

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (cause) {
    throw new ToolError('UNKNOWN', 'Could not copy to clipboard', { cause });
  }
}

export function useClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await copyText(text);
      } catch (e) {
        // Spec §6: no silent failures.
        notify.error(
          e instanceof ToolError ? e : 'Could not copy to clipboard',
        );
        setCopied(false);
        return false;
      }
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), resetMs);
      return true;
    },
    [resetMs],
  );

  return { copied, copy };
}
