import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, Card, CardBody, Stack } from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import { deriveFilename } from '@/shared/lib/download';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { useJob } from '@/shared/state/useJob';
import { qpdf, type PdfInspection } from '@/pdf/qpdf';
import {
  JobPanel,
  PasswordPrompt,
  PdfFileHeader,
  ResultFiles,
  type PdfInputFile,
  type ResultFile,
} from '@/pdf/components';

interface Inspected {
  file: PdfInputFile;
  info: PdfInspection | null;
  error: ToolError | null;
}

const UnlockTool: React.FC<ToolProps> = () => {
  const [file, setFile] = useState<PdfInputFile | null>(null);
  const [inspected, setInspected] = useState<Inspected | null>(null);

  useEffect(() => {
    if (!file) return;
    let alive = true;
    qpdf.inspect(file.bytes).then(
      (info) => {
        if (alive) setInspected({ file, info, error: null });
      },
      (e) => {
        if (alive) setInspected({ file, info: null, error: toToolError(e) });
      },
    );
    return () => {
      alive = false;
    };
  }, [file]);

  const job = useJob(
    async (
      ctx,
      source: PdfInputFile,
      password: string,
    ): Promise<ResultFile> => {
      const { bytes } = await qpdf.decrypt(source.bytes, password, ctx.signal);
      return {
        name: deriveFilename(source.name, 'unlocked', 'pdf'),
        bytes,
        detail: 'Password removed',
      };
    },
  );

  const current = inspected?.file === file ? inspected : null;
  const info = current?.info ?? null;
  const wrongPassword = job.error?.code === 'WRONG_PASSWORD';

  const pick = (picked: PdfInputFile) => {
    job.reset();
    setFile(picked);
  };
  const clearFile = () => {
    job.reset();
    setFile(null);
  };

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          {/* The encrypted file itself is what this tool works on. */}
          <PdfFileHeader
            file={file}
            onFile={pick}
            onClear={clearFile}
            loading={!!file && !current}
            error={current?.error ?? null}
            unlock={false}
          />
          {file && info && !info.encrypted && (
            <Alert status="info">
              <AlertDescription>
                This PDF isn&apos;t password-protected. There is nothing to
                unlock.
              </AlertDescription>
            </Alert>
          )}
          {file && info?.encrypted && !job.result && (
            // Keyed by file so a new file starts with an empty field.
            <PasswordPrompt
              key={file.id}
              fileName={file.name}
              submitLabel="Unlock PDF"
              busy={job.status === 'running'}
              description={
                info.needsPassword
                  ? 'Enter the password to open this file.'
                  : 'This file opens without a password but has permission restrictions. Enter its permissions password to remove them.'
              }
              error={
                wrongPassword
                  ? 'That password is not correct. Try again.'
                  : null
              }
              onSubmit={(pw) => void job.run(file, pw)}
            />
          )}
          {!wrongPassword && (
            <JobPanel job={job} onCancel={job.cancel} runningLabel="Unlocking">
              {job.result && <ResultFiles files={[job.result]} />}
            </JobPanel>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};

export default UnlockTool;
