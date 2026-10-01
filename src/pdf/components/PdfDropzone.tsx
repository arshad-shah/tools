import React, { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle, FileUpload } from '@/shared/ui';
import {
  acceptAttribute,
  describeKinds,
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
import { PasswordPrompt } from './PasswordPrompt';

/** A loaded file whose bytes are always plaintext. */
export interface PdfInputFile extends LoadedFile {
  /** The original was encrypted and has been decrypted in memory. */
  wasEncrypted: boolean;
}

interface PdfDropzoneProps {
  onFiles: (files: PdfInputFile[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  accept?: FileKind[];
  label?: React.ReactNode;
  hint?: React.ReactNode;
  /**
   * Decrypt encrypted PDFs before handing them over, prompting for a
   * password when one is needed (spec §6). Off for tools that work on the
   * encrypted file itself (Unlock).
   */
  unlock?: boolean;
}

interface LockedEntry {
  file: LoadedFile;
  error: string | null;
  busy: boolean;
}

const decrypted = (file: LoadedFile, bytes: Uint8Array): PdfInputFile => ({
  ...file,
  bytes,
  size: bytes.byteLength,
  wasEncrypted: true,
});

export const PdfDropzone: React.FC<PdfDropzoneProps> = ({
  onFiles,
  multiple,
  disabled,
  accept = ['pdf'],
  label,
  hint,
  unlock = true,
}) => {
  const [rejected, setRejected] = useState<string[]>([]);
  const [locked, setLocked] = useState<LockedEntry[]>([]);
  const [busy, setBusy] = useState(false);
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
    const loaded = await Promise.allSettled(
      files.map((f) => loadFile(f, accept)),
    );
    const errors: string[] = [];
    const candidates: LoadedFile[] = [];
    for (const r of loaded) {
      if (r.status === 'fulfilled') candidates.push(r.value);
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
    setLocked((prev) => (multiple ? [...prev, ...newlyLocked] : newlyLocked));
    for (const f of ready) {
      if (isOverSoftLimit(f.size))
        notify.info(
          `${f.name} is ${formatBytes(f.size)}. Large files may be slow.`,
        );
    }
    if (ready.length) onFiles(ready);
  };

  const patch = (id: string, p: Partial<LockedEntry>) =>
    setLocked((prev) =>
      prev.map((l) => (l.file.id === id ? { ...l, ...p } : l)),
    );
  const drop = (id: string) =>
    setLocked((prev) => prev.filter((l) => l.file.id !== id));

  const submit = async (entry: LockedEntry, password: string) => {
    const { id } = entry.file;
    patch(id, { busy: true, error: null });
    try {
      const bytes = await unlockWithPassword(entry.file.bytes, password, qpdf);
      if (!alive.current) return;
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

  return (
    <div className="flex flex-col gap-3">
      <FileUpload
        onFiles={handle}
        accept={acceptAttribute(accept)}
        multiple={multiple}
        disabled={disabled || busy}
        label={
          label ??
          (multiple
            ? `Drop ${describeKinds(accept)} files or click to browse`
            : `Drop a ${describeKinds(accept)} or click to browse`)
        }
        hint={hint ?? 'Files never leave your browser'}
      />
      {rejected.length > 0 && (
        <Alert status="danger">
          <AlertTitle>
            {rejected.length === 1
              ? 'A file was skipped'
              : `${rejected.length} files were skipped`}
          </AlertTitle>
          {rejected.map((m, i) => (
            <AlertDescription key={i}>{m}</AlertDescription>
          ))}
        </Alert>
      )}
      {locked.map((l) => (
        <PasswordPrompt
          key={l.file.id}
          fileName={l.file.name}
          error={l.error}
          busy={l.busy}
          onSubmit={(pw) => void submit(l, pw)}
          onCancel={() => drop(l.file.id)}
        />
      ))}
    </div>
  );
};
