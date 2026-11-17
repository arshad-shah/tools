import { useEffect, useRef } from 'react';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { useHandoffFiles } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';

/** Typing in a field keeps its own paste. */
function isTextField(t: EventTarget | null): boolean {
  return (
    t instanceof HTMLTextAreaElement ||
    (t instanceof HTMLInputElement &&
      !['button', 'checkbox', 'radio', 'file', 'range', 'color'].includes(
        t.type,
      )) ||
    (t instanceof HTMLElement && t.isContentEditable)
  );
}

/** The first image among pasted clipboard items, if any. */
function pastedImage(e: ClipboardEvent): File | null {
  for (const item of e.clipboardData?.items ?? [])
    if (item.kind === 'file' && item.type.startsWith('image/'))
      return item.getAsFile();
  return null;
}

/** Reads an image from the clipboard (the Paste button). */
export async function readClipboardImage(): Promise<File> {
  let items: ClipboardItems;
  try {
    items = await navigator.clipboard.read();
  } catch (cause) {
    throw new ToolError(
      'UNKNOWN',
      'Could not read the clipboard. Press Ctrl+V (Cmd+V on a Mac) on the page instead.',
      { cause },
    );
  }
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith('image/'));
    if (type) {
      const blob = await item.getType(type);
      return new File([blob], `pasted.${type.split('/')[1] ?? 'png'}`, {
        type,
      });
    }
  }
  throw new ToolError('INVALID_INPUT', 'The clipboard has no image');
}

/**
 * Images arrive three ways besides the picker: handed off from a hub or
 * another tool, pasted anywhere on the page (Mod+V), or read with the Paste
 * button.
 */
export function useImageInput(open: (file: File) => void) {
  const latest = useRef(open);
  useEffect(() => {
    latest.current = open;
  });

  useHandoffFiles((files) => {
    if (files[0]) open(files[0]);
    if (files.length > 1)
      notify.info(
        `Opened ${files[0].name}; this editor takes one image at a time`,
      );
  });

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (e.defaultPrevented || isTextField(e.target)) return;
      const file = pastedImage(e);
      if (!file) return;
      e.preventDefault();
      latest.current(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  return async () => {
    try {
      latest.current(await readClipboardImage());
    } catch (e) {
      notify.error(toToolError(e, 'Could not paste an image'));
    }
  };
}
