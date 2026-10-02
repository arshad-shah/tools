import { useMemo } from 'react';
import { CodeSurface } from './code-surface';
import { createBytesSource, type BytesMode } from './bytes-view-format';

export type { BytesMode } from './bytes-view-format';

export interface BytesViewProps {
  bytes: Uint8Array;
  mode?: BytesMode;
  bytesPerRow?: number;
  /** Accessible name of the read-only dump. */
  ariaLabel: string;
  maxHeight?: number | string;
  className?: string;
}

/**
 * Hex or binary dump with offsets and an ASCII column (control bytes shown
 * by name, NUL to US and DEL; bytes above 0x7F as '.'). Built on a
 * read-only CodeSurface fed row by row, so only the visible rows are ever
 * formatted: a 16 MB file is a million rows and stays smooth. Mod+A then
 * copy copies the whole dump.
 */
export function BytesView({
  bytes,
  mode = 'hex',
  bytesPerRow = 16,
  ariaLabel,
  maxHeight,
  className,
}: BytesViewProps) {
  const perRow = Math.max(1, Math.floor(bytesPerRow));
  const source = useMemo(
    () => createBytesSource(bytes, mode, perRow),
    [bytes, mode, perRow],
  );
  return (
    <CodeSurface
      value=""
      source={source}
      language="plain"
      label={ariaLabel}
      readOnly
      lineNumbers={false}
      maxHeight={maxHeight}
      className={className}
    />
  );
}
BytesView.displayName = 'BytesView';
