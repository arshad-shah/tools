import React from 'react';
import { Alert, AlertDescription, Button, Inline, Text } from '@/shared/ui';
import type { PdfInputFile } from './PdfDropzone';
import type { ToolError } from '@/shared/lib/errors';
import { PdfDropzone } from './PdfDropzone';

interface PdfFileHeaderProps {
  file: PdfInputFile | null;
  /** Called with the first dropped/picked file. */
  onFile: (file: PdfInputFile) => void;
  /** "Choose another file". */
  onClear: () => void;
  /** From usePdfDocument. */
  loading: boolean;
  error: ToolError | null;
  /** Passed to PdfDropzone: false hands over encrypted files as they are. */
  unlock?: boolean;
  /** Hub handoff files (see PdfDropzone). */
  initialFiles?: File[] | null;
}

/**
 * The single-document tool header: a dropzone until a file is chosen, then
 * its name with "Choose another file", plus the opening and error states.
 */
export const PdfFileHeader: React.FC<PdfFileHeaderProps> = ({
  file,
  onFile,
  onClear,
  loading,
  error,
  unlock,
  initialFiles,
}) => (
  <>
    {!file ? (
      <PdfDropzone
        unlock={unlock}
        initialFiles={initialFiles}
        onFiles={(files) => onFile(files[0])}
      />
    ) : (
      <Inline justify="between" align="center" gap="3" wrap>
        <Text weight="semibold">{file.name}</Text>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Choose another file
        </Button>
      </Inline>
    )}
    {loading && <Text tone="muted">Opening…</Text>}
    {error && (
      <Alert status="danger">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )}
  </>
);
