import { toToolError } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { notify } from '@/shared/lib/notify';
import { decodeText, tooLarge, utf8Length } from '@/shared/lib/text-input-lib';

export interface TextFileOptions {
  onChange(text: string): void;
  /** Takes a file itself (return true); otherwise it is read as text. */
  onFile?: (file: File) => boolean | void;
  /** Larger text (in UTF-8 bytes) is refused. */
  maxBytes?: number;
}

/**
 * Reads a picked or dropped file into a text input (UTF-8, size-checked),
 * for Open file and for a TextArea's `onFiles`.
 */
export function useTextFile({ onChange, onFile, maxBytes }: TextFileOptions) {
  const take = (text: string, what: string) => {
    if (maxBytes !== undefined && utf8Length(text) > maxBytes) {
      notify.error(tooLarge(what, maxBytes));
      return;
    }
    onChange(text);
  };

  const open = async (file: File) => {
    if (onFile?.(file) === true) return;
    if (maxBytes !== undefined && file.size > maxBytes) {
      notify.error(tooLarge(file.name, maxBytes));
      return;
    }
    try {
      take(decodeText(await readBytes(file), 'utf-8', file.name), file.name);
    } catch (e) {
      notify.error(toToolError(e, `Could not read ${file.name}`));
    }
  };

  return {
    take,
    open,
    /** For TextArea `onFiles`: the first dropped file. */
    onFiles: (files: File[]) => {
      if (files[0]) void open(files[0]);
    },
  };
}
