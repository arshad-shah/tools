import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { newId } from './id';

/**
 * Files handed from a hub drop to a tool (spec §5.3). In memory only, never
 * persisted; each id can be taken once.
 */
const pending = new Map<string, File[]>();

export const HANDOFF_PARAM = 'handoff';

export function putHandoff(files: File[]): string {
  const id = newId();
  pending.set(id, files);
  return id;
}

/** The files for `id`, removed on read; null when unknown or already taken. */
export function takeHandoff(id: string): File[] | null {
  const files = pending.get(id) ?? null;
  pending.delete(id);
  return files;
}

/**
 * Reads `?handoff=<id>` once per mount and removes the param from the URL
 * with replaceState (no navigation).
 */
function useHandoffReader(onRead: (files: File[]) => void): void {
  const latest = useRef(onRead);
  useEffect(() => {
    latest.current = onRead;
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get(HANDOFF_PARAM);
    if (id === null) return;
    url.searchParams.delete(HANDOFF_PARAM);
    window.history.replaceState(
      window.history.state,
      '',
      url.pathname + url.search + url.hash,
    );
    const files = takeHandoff(id);
    if (files?.length) latest.current(files);
  }, []);
}

/** The handed-off files as state (null until and unless there are some). */
export function useHandoff(): File[] | null {
  const [files, setFiles] = useState<File[] | null>(null);
  useHandoffReader(setFiles);
  return files;
}

/**
 * Calls `onFiles` once with the handed-off files. Delivery waits for the
 * render after the read, so StrictMode's mount-unmount-mount check (which
 * cancels jobs started on the first mount) is over by then.
 */
export function useHandoffFiles(onFiles: (files: File[]) => void): void {
  const files = useHandoff();
  const deliver = useEffectEvent(onFiles);
  const delivered = useRef<File[] | null>(null);
  useEffect(() => {
    if (!files || delivered.current === files) return;
    delivered.current = files;
    deliver(files);
  }, [files]);
}
