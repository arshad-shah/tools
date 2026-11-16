import { FileInputBase } from '@arshad-shah/cynosure';
import { useCallback, useState, type ReactNode } from 'react';

/**
 * A file chooser behind any trigger: `children(open)` renders the trigger
 * and a hidden FileInputBase takes the files. Cynosure has no file-picker
 * button (docs/cynosure-gaps.md, gap 19).
 */
export function FilePicker({
  onFiles,
  accept,
  multiple,
  children,
}: {
  onFiles(files: File[]): void;
  accept?: string;
  multiple?: boolean;
  children(open: () => void): ReactNode;
}) {
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  // A fresh input after each choice, so the same file can be chosen again.
  const [round, setRound] = useState(0);
  const open = useCallback(() => input?.click(), [input]);
  return (
    <>
      {children(open)}
      <FileInputBase
        key={round}
        ref={setInput}
        hidden
        tabIndex={-1}
        aria-hidden
        accept={accept}
        multiple={multiple}
        onFiles={(files) => {
          if (files.length) onFiles(files);
          setRound((r) => r + 1);
        }}
      />
    </>
  );
}
