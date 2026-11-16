import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  isOverSoftLimit,
  loadFile,
  type FileKind,
  type LoadedFile,
} from '@/shared/lib/files';
import { logToolError, toToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';
import { notify } from '@/shared/lib/notify';
// Module paths, not the barrel, so tests can mock the client.
import { qpdf } from '@/pdf/qpdf/client';
import { preparePdf, unlockWithPassword } from '@/pdf/qpdf/unlock';

/** A loaded file whose bytes are always plaintext. */
export interface PdfInputFile extends LoadedFile {
  /** The original was encrypted and has been decrypted in memory. */
  wasEncrypted: boolean;
  /**
   * Increases in drop order, across drops. A locked file is handed over
   * only once unlocked, so hosts that keep a list (Merger) use this to put
   * it back where it was dropped.
   */
  order: number;
}

let nextOrder = 0;

export interface LockedEntry {
  file: LoadedFile & { order: number };
  error: string | null;
  busy: boolean;
}

const decrypted = (
  file: LoadedFile & { order: number },
  bytes: Uint8Array,
): PdfInputFile => ({
  ...file,
  bytes,
  size: bytes.byteLength,
  wasEncrypted: true,
});

export interface PdfIntakeOptions {
  onFiles: (files: PdfInputFile[]) => void;
  multiple?: boolean;
  accept?: FileKind[];
  /**
   * Decrypt encrypted PDFs before handing them over, asking for a password
   * when one is needed (spec §6). Off for tools that work on the encrypted
   * file itself (Unlock).
   */
  unlock?: boolean;
  /**
   * Files handed over by a hub drop (`useHandoff`), processed once through
   * the same load and password flow as a drop.
   */
  initialFiles?: File[] | null;
}

/**
 * How dropped PDFs come in (no UI): each file is loaded and checked, an
 * encrypted one is decrypted in memory (or waits for its password), and the
 * ready files are handed over in drop order. Shared by the old PdfDropzone
 * and the redesigned file tools.
 */
export function usePdfIntake({
  onFiles,
  multiple,
  accept = ['pdf'],
  unlock = true,
  initialFiles,
}: PdfIntakeOptions) {
  const [rejected, setRejected] = useState<string[]>([]);
  const [locked, setLocked] = useState<LockedEntry[]>([]);
  const [busy, setBusy] = useState(false);
  // What is locked right now, for async work that outlives a render. It is
  // updated in the same call as the state (never one render later), so an
  // unlock finishing just after a replacing drop sees the replacement.
  const lockedNow = useRef<LockedEntry[]>([]);
  const updateLocked = (next: (prev: LockedEntry[]) => LockedEntry[]) => {
    lockedNow.current = next(lockedNow.current);
    setLocked(lockedNow.current);
  };
  // A decryption that finishes after unmount must not hand files over.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const handle = async (files: File[]) => {
    setBusy(true);
    // Numbered now, in drop order, before any async work reorders them.
    const orders = files.map(() => nextOrder++);
    const loaded = await Promise.allSettled(
      files.map((f) => loadFile(f, accept)),
    );
    const errors: string[] = [];
    const candidates: (LoadedFile & { order: number })[] = [];
    for (const [i, r] of loaded.entries()) {
      if (r.status === 'fulfilled')
        candidates.push({ ...r.value, order: orders[i] });
      else {
        const error = toToolError(r.reason);
        logToolError(error);
        errors.push(error.message);
      }
    }
    const prepared = await Promise.allSettled(
      candidates.map((f) =>
        unlock && f.kind === 'pdf'
          ? preparePdf(f.bytes, qpdf)
          : Promise.resolve({
              status: 'ready' as const,
              bytes: f.bytes,
              wasEncrypted: false,
            }),
      ),
    );
    if (!alive.current) return;
    const ready: PdfInputFile[] = [];
    const newlyLocked: LockedEntry[] = [];
    prepared.forEach((r, i) => {
      const f = candidates[i];
      if (r.status === 'rejected') {
        const error = toToolError(r.reason);
        logToolError(error);
        errors.push(`${f.name}: ${error.message}`);
      } else if (r.value.status === 'locked')
        newlyLocked.push({ file: f, error: null, busy: false });
      else if (r.value.wasEncrypted) ready.push(decrypted(f, r.value.bytes));
      else ready.push({ ...f, wasEncrypted: false });
    });
    setBusy(false);
    setRejected(errors);
    updateLocked((prev) =>
      multiple ? [...prev, ...newlyLocked] : newlyLocked,
    );
    for (const f of ready) {
      if (isOverSoftLimit(f.size))
        notify.info(
          `${f.name} is ${formatBytes(f.size)}. Large files may be slow.`,
        );
    }
    if (ready.length) onFiles(ready);
  };

  // Each handed-over list is processed once (StrictMode re-runs effects).
  const handedOver = useRef<File[] | null>(null);
  const takeHandoff = useEffectEvent((files: File[]) => {
    void handle(multiple ? files : files.slice(0, 1));
  });
  useEffect(() => {
    if (!initialFiles?.length || handedOver.current === initialFiles) return;
    handedOver.current = initialFiles;
    takeHandoff(initialFiles);
  }, [initialFiles]);

  const patch = (id: string, p: Partial<LockedEntry>) =>
    updateLocked((prev) =>
      prev.map((l) => (l.file.id === id ? { ...l, ...p } : l)),
    );
  const drop = (id: string) =>
    updateLocked((prev) => prev.filter((l) => l.file.id !== id));

  const submit = async (entry: LockedEntry, password: string) => {
    const { id } = entry.file;
    patch(id, { busy: true, error: null });
    try {
      const bytes = await unlockWithPassword(entry.file.bytes, password, qpdf);
      // Gone meanwhile (unmounted, skipped, or replaced by a newer drop).
      if (!alive.current || !lockedNow.current.some((l) => l.file.id === id))
        return;
      drop(id);
      onFiles([decrypted(entry.file, bytes)]);
    } catch (e) {
      if (!alive.current) return;
      const err = toToolError(e);
      if (err.code !== 'WRONG_PASSWORD') logToolError(err);
      patch(id, {
        busy: false,
        error:
          err.code === 'WRONG_PASSWORD'
            ? 'That password is not correct. Try again.'
            : err.message,
      });
    }
  };

  return {
    /** Load, check and (if needed) decrypt files from a drop or a picker. */
    handle: (files: File[]) => void handle(files),
    busy,
    /** Why files were skipped on the last drop, one message each. */
    rejected,
    /** Encrypted files waiting for their password. */
    locked,
    submit: (entry: LockedEntry, password: string) =>
      void submit(entry, password),
    /** Skip a locked file. */
    skip: drop,
  };
}
