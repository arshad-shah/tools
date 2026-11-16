import React from 'react';
import { Alert, AlertDescription, AlertTitle, FileUpload } from '@/shared/ui';
import {
  acceptAttribute,
  describeKinds,
  type FileKind,
} from '@/shared/lib/files';
import { usePdfIntake, type PdfInputFile } from '@/pdf/intake/use-pdf-intake';
import { PasswordPrompt } from './PasswordPrompt';

export type { PdfInputFile } from '@/pdf/intake/use-pdf-intake';

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
  /**
   * Files handed over by a hub drop (`useHandoff`), processed once through
   * the same load and password flow as a drop.
   */
  initialFiles?: File[] | null;
}

export const PdfDropzone: React.FC<PdfDropzoneProps> = ({
  onFiles,
  multiple,
  disabled,
  accept = ['pdf'],
  label,
  hint,
  unlock = true,
  initialFiles,
}) => {
  const { handle, busy, rejected, locked, submit, skip } = usePdfIntake({
    onFiles,
    multiple,
    accept,
    unlock,
    initialFiles,
  });

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
          disabled={disabled}
          onSubmit={(pw) => submit(l, pw)}
          onCancel={() => skip(l.file.id)}
        />
      ))}
    </div>
  );
};
