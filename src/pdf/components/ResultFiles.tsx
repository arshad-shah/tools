import React, { useState } from 'react';
import { IconDownload, IconFileDown } from '@/shared/ui/icons';
import { Button, Text } from '@/shared/ui';
import { saveBlob, saveZip } from '@/shared/lib/download';
import { formatBytes, formatSizeChange } from '@/shared/lib/format';
import { notify } from '@/shared/lib/notify';
import { logToolError, toToolError } from '@/shared/lib/errors';

export interface ResultFile {
  name: string;
  bytes: Uint8Array;
  /** Defaults to application/pdf. */
  mime?: string;
  detail?: string;
}

interface ResultFilesProps {
  files: ResultFile[];
  /** Shown as a before/after comparison when there is exactly one output. */
  inputSize?: number;
  /** When set and there are several files, offers a ZIP of all of them. */
  zipName?: string;
  /** A line under the header, e.g. UNENCRYPTED_NOTE. */
  note?: React.ReactNode;
}

export const ResultFiles: React.FC<ResultFilesProps> = ({
  files,
  inputSize,
  zipName,
  note,
}) => {
  const [zipping, setZipping] = useState(false);
  const downloadZip = async (name: string) => {
    setZipping(true);
    try {
      await saveZip(
        files.map((f) => ({ name: f.name, data: f.bytes })),
        name,
      );
      notify.success(`Saved ${name}`);
    } catch (e) {
      const error = toToolError(e);
      logToolError(error);
      notify.error(error.message);
    } finally {
      setZipping(false);
    }
  };
  const total = files.reduce((n, f) => n + f.bytes.byteLength, 0);
  return (
    <div className="flex flex-col gap-3 rounded-md border border-success/40 bg-success/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text size="sm" weight="semibold">
          {files.length === 1 ? 'Ready' : `${files.length} files ready`} ·{' '}
          {formatBytes(total)}
          {inputSize !== undefined && files.length === 1 && (
            <span className="ml-2 font-mono text-xs text-fg-muted">
              from {formatBytes(inputSize)} (
              {formatSizeChange(inputSize, total)})
            </span>
          )}
        </Text>
        {zipName && files.length > 1 && (
          <Button
            size="sm"
            variant="solid"
            leftIcon={<IconDownload size="sm" />}
            loading={zipping}
            onClick={() => void downloadZip(zipName)}
          >
            Download all (ZIP)
          </Button>
        )}
      </div>
      {note && <p className="text-sm text-fg-muted">{note}</p>}
      <ul className="flex flex-col gap-2">
        {files.map((f, i) => (
          // Names may repeat; position is the stable identity here.
          <li key={i} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-fg">{f.name}</p>
              <p className="font-mono text-xs text-fg-muted">
                {formatBytes(f.bytes.byteLength)}
                {f.detail && ` · ${f.detail}`}
              </p>
            </div>
            <Button
              size="sm"
              variant={files.length === 1 ? 'solid' : 'soft'}
              leftIcon={<IconFileDown size="sm" />}
              aria-label={`Download ${f.name}`}
              onClick={() =>
                saveBlob(f.bytes, f.name, f.mime ?? 'application/pdf')
              }
            >
              Download
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};
