import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { extract } from '@/pdf/edit';

interface Built {
  from: Uint8Array;
  key: string;
  bytes: Uint8Array | null;
  error: ToolError | null;
}

/**
 * Live preview bytes: one page of `source` run through `build`, debounced by
 * `settingsKey` (serialise the settings that affect the output). The last
 * good preview stays visible while a newer one is pending.
 */
export function usePreviewBytes(
  source: Uint8Array | null,
  pageIndex: number,
  settingsKey: string,
  build: (page: Uint8Array) => Promise<Uint8Array>,
  delayMs = 250,
): { bytes: Uint8Array | null; error: ToolError | null; pending: boolean } {
  const buildRef = useRef(build);
  useLayoutEffect(() => {
    buildRef.current = build;
  });
  const [page, setPage] = useState<{
    source: Uint8Array;
    pageIndex: number;
    bytes: Uint8Array | null;
    error: ToolError | null;
  } | null>(null);
  const [built, setBuilt] = useState<Built | null>(null);

  useEffect(() => {
    if (!source) return;
    let alive = true;
    extract(source, [pageIndex]).then(
      (bytes) => alive && setPage({ source, pageIndex, bytes, error: null }),
      (e) =>
        alive &&
        setPage({ source, pageIndex, bytes: null, error: toToolError(e) }),
    );
    return () => {
      alive = false;
    };
  }, [source, pageIndex]);

  const current =
    page && page.source === source && page.pageIndex === pageIndex
      ? page
      : null;
  const from = current?.bytes ?? null;

  useEffect(() => {
    if (!from) return;
    let alive = true;
    const timer = setTimeout(() => {
      buildRef.current(from).then(
        (bytes) =>
          alive && setBuilt({ from, key: settingsKey, bytes, error: null }),
        (e) =>
          alive &&
          setBuilt({
            from,
            key: settingsKey,
            bytes: null,
            error: toToolError(e),
          }),
      );
    }, delayMs);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [from, settingsKey, delayMs]);

  if (current?.error)
    return { bytes: null, error: current.error, pending: false };
  const mine = built && built.from === from ? built : null;
  return {
    bytes: mine?.bytes ?? null,
    error: mine?.key === settingsKey ? mine.error : null,
    pending: !mine || mine.key !== settingsKey,
  };
}
