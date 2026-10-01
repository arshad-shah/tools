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

export async function readClipboardText(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch (cause) {
    throw new ToolError('UNKNOWN', 'Could not read from clipboard', { cause });
  }
}

/**
 * `copy(text, key?)` copies and remembers `key` (default `'default'`) as
 * `copiedKey` for `resetMs`, so a screen with several Copy buttons can show
 * feedback on the one pressed only.
 */
export function useClipboard(resetMs = 2000) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string, key = 'default'): Promise<boolean> => {
      try {
        await copyText(text);
      } catch (e) {
        // Spec §6: no silent failures.
        notify.error(
          e instanceof ToolError ? e : 'Could not copy to clipboard',
        );
        setCopiedKey(null);
        return false;
      }
      setCopiedKey(key);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedKey(null), resetMs);
      return true;
    },
    [resetMs],
  );

  return { copied: copiedKey !== null, copiedKey, copy };
}
