import {
  Button,
  Card,
  IconButton,
  IconTile,
  Inline,
  ListRow,
  ListRows,
  Notice,
  ProgressBar,
  Stack,
  useToast,
} from '@arshad-shah/cynosure';
import {
  arrowRight,
  download,
  file as fileIcon,
} from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { stageDocument } from '@/pdf/workspace/workspace-store';
import { saveBlob, saveZip } from '@/shared/lib/download';
import { logToolError, toToolError } from '@/shared/lib/errors';
import { formatBytes, formatSizeChange } from '@/shared/lib/format';
import type { JobState } from '@/shared/state/useJob';

export interface ResultFile {
  name: string;
  bytes: Uint8Array;
  /** Defaults to application/pdf. */
  mime?: string;
  detail?: string;
}

export interface ResultCardProps {
  files: ResultFile[];
  /** Shown as a before and after when there is exactly one output. */
  inputSize?: number;
  /** With several files: offers one ZIP of them all. */
  zipName?: string;
  /** A line under the success message, e.g. that the copy is not encrypted. */
  note?: string;
  /** Offers "Open in the workspace" when the result is one PDF. */
  openInWorkspace?: boolean;
}

const save = (f: ResultFile) =>
  saveBlob(f.bytes, f.name, f.mime ?? 'application/pdf');

/**
 * Step 4 of a file tool (redesign spec): a success Notice that says what
 * was made, the download buttons, and the hand-off to the workspace.
 */
export function ResultCard({
  files,
  inputSize,
  zipName,
  note,
  openInWorkspace,
}: ResultCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [zipping, setZipping] = useState(false);
  const total = files.reduce((n, f) => n + f.bytes.byteLength, 0);
  const one = files.length === 1 ? files[0] : null;
  const isPdf = (f: ResultFile) =>
    (f.mime ?? 'application/pdf') === 'application/pdf';

  const downloadZip = async (name: string) => {
    setZipping(true);
    try {
      await saveZip(
        files.map((f) => ({ name: f.name, data: f.bytes })),
        name,
      );
    } catch (e) {
      const error = toToolError(e);
      logToolError(error);
      toast({ title: error.message, tone: 'danger' });
    } finally {
      setZipping(false);
    }
  };

  const size =
    one && inputSize !== undefined
      ? `${formatBytes(total)}, from ${formatBytes(inputSize)} (${formatSizeChange(inputSize, total)})`
      : formatBytes(total);

  return (
    <Card as="section" title="Result" padding="lg">
      <Stack gap="5">
        <Notice
          tone="success"
          title={
            one ? `${one.name} is ready` : `${files.length} files are ready`
          }
        >
          {[one?.detail, size, note].filter(Boolean).join('. ')}.
        </Notice>
        {one ? null : (
          <ListRows label="Files" divided>
            {files.map((f, i) => (
              <ListRow
                // Names may repeat; the position is the identity here.
                key={i}
                label={f.name}
                description={[formatBytes(f.bytes.byteLength), f.detail]
                  .filter(Boolean)
                  .join(', ')}
                leading={<IconTile icon={fileIcon} size="sm" tone="neutral" />}
                actions={
                  <IconButton
                    icon={download}
                    label={`Download ${f.name}`}
                    size="sm"
                    variant="ghost"
                    onClick={() => save(f)}
                  />
                }
              />
            ))}
          </ListRows>
        )}
        <Inline gap="3" wrap>
          {one ? (
            <Button
              variant="solid"
              tone="accent"
              icon={download}
              onClick={() => save(one)}
            >
              {`Download ${one.name}`}
            </Button>
          ) : zipName ? (
            <Button
              variant="solid"
              tone="accent"
              icon={download}
              loading={zipping}
              onClick={() => void downloadZip(zipName)}
            >
              Download all (ZIP)
            </Button>
          ) : null}
          {openInWorkspace && one && isPdf(one) ? (
            <Button
              variant="soft"
              iconEnd={arrowRight}
              onClick={() => {
                const id = stageDocument({
                  name: one.name,
                  bytes: one.bytes,
                  wasEncrypted: false,
                });
                navigate(`/pdf/edit?open=${id}`);
              }}
            >
              Open in the workspace
            </Button>
          ) : null}
        </Inline>
      </Stack>
    </Card>
  );
}

/**
 * Step 3 while it runs, and an error next to the button that caused it: a
 * ProgressBar with Cancel, or a danger Notice.
 */
export function JobProgress<R>({
  job,
  label,
  onCancel,
}: {
  job: JobState<R>;
  label: string;
  onCancel(): void;
}) {
  if (job.status === 'error' && job.error)
    return <Notice tone="danger">{job.error.message}</Notice>;
  if (job.status !== 'running') return null;
  return (
    <Stack gap="3">
      <ProgressBar
        label={job.progress?.label ?? label}
        value={job.progress?.done}
        max={job.progress?.total ?? 1}
        indeterminate={!job.progress}
      />
      <Inline>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </Inline>
    </Stack>
  );
}
