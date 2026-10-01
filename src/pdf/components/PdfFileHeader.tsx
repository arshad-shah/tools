import React from 'react';
import { Alert, AlertDescription, Button, Inline, Text } from '@/shared/ui';
import type { LoadedFile } from '@/shared/lib/files';
import type { ToolError } from '@/shared/lib/errors';
import { PdfDropzone } from './PdfDropzone';

interface PdfFileHeaderProps {
  file: LoadedFile | null;
  /** Called with the first dropped/picked file. */
  onFile: (file: LoadedFile) => void;
  /** "Choose another file". */
  onClear: () => void;
  /** From usePdfDocument. */
  loading: boolean;
  error: ToolError | null;
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
}) => (
  <>
    {!file ? (
      <PdfDropzone onFiles={(files) => onFile(files[0])} />
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
