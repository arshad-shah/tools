import React from 'react';
import { IconUpload } from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  Button,
  Container,
  FileUpload,
  Inline,
  Stack,
} from '@/shared/ui';

interface UploadViewProps {
  delimiterControl: React.ReactNode;
  onFile: (file: File) => void;
  onLoadSample: () => void;
  loading: boolean;
  parseError: string | null;
}

/** The start screen shown before any data is loaded. */
export const UploadView: React.FC<UploadViewProps> = ({
  delimiterControl,
  onFile,
  onLoadSample,
  loading,
  parseError,
}) => (
  <Container size="lg">
    <Stack gap="4">
      <FileUpload
        accept=".csv,.tsv"
        onFiles={(files) => {
          if (files[0]) onFile(files[0]);
        }}
      />
      <Inline gap="4" wrap justify="center" align="center">
        {delimiterControl}
        <Button
          variant="soft"
          leftIcon={<IconUpload size="sm" />}
          onClick={onLoadSample}
          disabled={loading}
        >
          Load sample data
        </Button>
      </Inline>
      {parseError && (
        <Alert status="danger">
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}
      {loading && (
        <Alert status="info">
          <AlertDescription>Processing your file…</AlertDescription>
        </Alert>
      )}
    </Stack>
  </Container>
);
