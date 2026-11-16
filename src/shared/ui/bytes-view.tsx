import { useMemo } from 'react';
import { formatBytes } from '@/shared/lib/format';
import { Text } from '@arshad-shah/cynosure';
import { CodeEditor } from '@/shared/editor';
import { createBytesSource, type BytesMode } from './bytes-view-format';

export type { BytesMode } from './bytes-view-format';

/** Bytes dumped at most: the dump is one text, so a huge file is cut. */
export const MAX_DUMP_BYTES = 1024 * 1024;

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
 * by name, NUL to US and DEL; bytes above 0x7F as '.'). A read-only
 * CodeEditor, which draws only the visible rows; large dumps run in its
 * large-document mode. Past MAX_DUMP_BYTES only the start is shown.
 */
export function BytesView({
  bytes,
  mode = 'hex',
  bytesPerRow = 16,
  ariaLabel,
  maxHeight,
}: BytesViewProps) {
  const perRow = Math.max(1, Math.floor(bytesPerRow));
  const cut = bytes.length > MAX_DUMP_BYTES;
  const text = useMemo(
    () =>
      createBytesSource(
        cut ? bytes.subarray(0, MAX_DUMP_BYTES) : bytes,
        mode,
        perRow,
      ).text!(),
    [bytes, cut, mode, perRow],
  );
  return (
    <>
      {cut ? (
        <Text size="sm" tone="muted">
          {`Showing the first ${formatBytes(MAX_DUMP_BYTES)} of ${formatBytes(bytes.length)}.`}
        </Text>
      ) : null}
      <CodeEditor
        value={text}
        aria-label={ariaLabel}
        readOnly
        lineNumbers={false}
        maxHeight={maxHeight}
      />
    </>
  );
}
BytesView.displayName = 'BytesView';
