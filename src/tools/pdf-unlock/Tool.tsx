import { Notice, Stack } from '@arshad-shah/cynosure';
import { useEffect, useState } from 'react';
import type { PdfInputFile } from '@/pdf/intake/use-pdf-intake';
import { qpdf, type PdfInspection } from '@/pdf/qpdf';
import { ChosenFile } from '@/pdf/ui/ChosenFile';
import { PasswordForm } from '@/pdf/ui/PasswordForm';
import { PdfIntake } from '@/pdf/ui/PdfIntake';
import { JobProgress, ResultCard, type ResultFile } from '@/pdf/ui/ResultCard';
import { deriveFilename } from '@/shared/lib/download';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { useHandoff } from '@/shared/lib/handoff';
import { useJob } from '@/shared/state/useJob';

interface Inspected {
  file: PdfInputFile;
  info: PdfInspection | null;
  error: ToolError | null;
}

/**
 * Unlock PDF (redesign spec, file tool pattern): drop the encrypted PDF,
 * enter its password next to it, download the unlocked copy.
 */
export default function UnlockTool() {
  // Files dropped on a hub land here once (spec §5.3).
  const handed = useHandoff();
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
    <Stack gap="6">
      {file ? (
        <ChosenFile
          name={file.name}
          size={file.size}
          detail={
            !current
              ? 'Checking'
              : info?.encrypted
                ? 'Password-protected'
                : undefined
          }
          disabled={job.status === 'running'}
          onClear={clearFile}
        />
      ) : (
        // The encrypted file itself is what this tool works on.
        <PdfIntake
          initialFiles={handed}
          unlock={false}
          onFiles={(files) => pick(files[0])}
        />
      )}
      {current?.error ? (
        <Notice tone="danger">{current.error.message}</Notice>
      ) : null}
      {file && info && !info.encrypted ? (
        <Notice tone="info" title="Nothing to unlock">
          This PDF is not password-protected.
        </Notice>
      ) : null}
      {file && info?.encrypted && job.status !== 'done' ? (
        // Keyed by file so a new file starts with an empty field.
        <PasswordForm
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
            wrongPassword ? 'That password is not correct. Try again.' : null
          }
          onSubmit={(pw) => void job.run(file, pw)}
        />
      ) : null}
      {wrongPassword ? null : (
        <JobProgress job={job} label="Unlocking" onCancel={job.cancel} />
      )}
      {job.status === 'done' && job.result ? (
        <ResultCard openInWorkspace files={[job.result]} />
      ) : null}
    </Stack>
  );
}
