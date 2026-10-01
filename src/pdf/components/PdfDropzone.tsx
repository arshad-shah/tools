import React, { useState } from 'react';
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

interface PdfDropzoneProps {
  onFiles: (files: LoadedFile[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  accept?: FileKind[];
  label?: React.ReactNode;
  hint?: React.ReactNode;
}

export const PdfDropzone: React.FC<PdfDropzoneProps> = ({
  onFiles,
  multiple,
  disabled,
  accept = ['pdf'],
  label,
  hint,
}) => {
  const [rejected, setRejected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const handle = async (files: File[]) => {
    setBusy(true);
    const results = await Promise.allSettled(
      files.map((f) => loadFile(f, accept)),
    );
    setBusy(false);
    const ok: LoadedFile[] = [];
    const errors: string[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') ok.push(r.value);
      else {
        const error = toToolError(r.reason);
        logToolError(error);
        errors.push(error.message);
      }
    }
    setRejected(errors);
    for (const f of ok) {
      if (isOverSoftLimit(f.size))
        notify.info(
          `${f.name} is ${formatBytes(f.size)}. Large files may be slow.`,
        );
    }
    if (ok.length) onFiles(ok);
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
    </div>
  );
};
