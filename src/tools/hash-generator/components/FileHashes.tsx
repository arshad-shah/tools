import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IconCopy, IconDownload, IconX } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  DataGrid,
  DropZone,
  IconButton,
  Inline,
  Meter,
  Select,
  Stack,
  Text,
  type GridColumn,
} from '@/shared/ui';
import { copyText } from '@/shared/lib/clipboard';
import { digestInfo, type DigestId } from '@/shared/lib/crypto/digest';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';
import { newId } from '@/shared/lib/id';
import { notify } from '@/shared/lib/notify';
import { createTextWorker } from '@/shared/workers/text-client';
import {
  checksumExtension,
  toChecksumFile,
  type ChecksumRow,
} from '../lib/checksum-file';
import { formatDigest, type DigestFormat } from '../lib/format';

interface FileRow extends ChecksumRow {
  id: string;
  size: number;
  status: 'hashing' | 'done' | 'error' | 'cancelled';
  done: number;
  error?: string;
}

const STATUS_TEXT = {
  done: 'Done',
  error: 'Failed',
  cancelled: 'Cancelled',
} as const;

const progressText = (r: FileRow) =>
  r.status === 'hashing'
    ? `${formatBytes(r.done)} of ${formatBytes(r.size)}`
    : STATUS_TEXT[r.status];

interface FileHashesProps {
  selected: DigestId[];
  output: DigestFormat;
  /** Files handed over from a hub drop. */
  incoming: File[] | null;
}

/**
 * Many files, each streamed through its own killable text worker (4 MB
 * slices) with progress and Cancel; results in a DataGrid with one column
 * per algorithm, exportable as a sha256sum-style checksum file.
 */
export const FileHashes: React.FC<FileHashesProps> = ({
  selected,
  output,
  incoming,
}) => {
  const [rows, setRows] = useState<FileRow[]>([]);
  const jobs = useRef(new Map<string, AbortController>());
  const [exportAlg, setExportAlg] = useState<DigestId>(
    selected.includes('sha256') ? 'sha256' : selected[0],
  );
  const alg = selected.includes(exportAlg) ? exportAlg : selected[0];

  useEffect(() => {
    const live = jobs.current;
    return () => live.forEach((c) => c.abort());
  }, []);

  const patch = (id: string, p: Partial<FileRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const hashFiles = (files: File[]) => {
    const algs = [...selected];
    for (const file of files) {
      const id = newId();
      const ctrl = new AbortController();
      jobs.current.set(id, ctrl);
      setRows((rs) => [
        ...rs,
        {
          id,
          name: file.name,
          size: file.size,
          results: {},
          status: 'hashing',
          done: 0,
        },
      ]);
      const worker = createTextWorker();
      worker
        .call('hash.file', [file, algs], {
          signal: ctrl.signal,
          onProgress: (p) => patch(id, { done: p.done }),
        })
        .then(
          (results) => patch(id, { results, status: 'done', done: file.size }),
          (e) => {
            const err = toToolError(e);
            patch(id, {
              status: err.code === 'CANCELLED' ? 'cancelled' : 'error',
              error: err.message,
            });
          },
        )
        .finally(() => {
          jobs.current.delete(id);
          worker.terminate();
        });
    }
  };

  const delivered = useRef<File[] | null>(null);
  useEffect(() => {
    if (!incoming || delivered.current === incoming) return;
    delivered.current = incoming;
    hashFiles(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  const columns = useMemo<GridColumn<FileRow>[]>(
    () => [
      { id: 'name', header: 'Name', accessor: (r) => r.name, pinned: 'start' },
      {
        id: 'size',
        header: 'Size',
        accessor: (r) => formatBytes(r.size),
      },
      {
        id: 'progress',
        header: 'Progress',
        accessor: progressText,
        minWidth: 200,
        render: (r) =>
          r.status === 'hashing' ? (
            <>
              <Meter
                className="min-w-0 flex-1"
                label={`Hashing ${r.name}`}
                value={r.size ? r.done / r.size : 0}
                valueText={progressText(r)}
                tone="ok"
                hideLabel
              />
              <IconButton
                size="sm"
                variant="ghost"
                icon={IconX}
                label={`Cancel ${r.name}`}
                onClick={() => jobs.current.get(r.id)?.abort()}
              />
            </>
          ) : (
            <span className="truncate">{progressText(r)}</span>
          ),
      },
      ...selected.map((d) => ({
        id: d,
        header: digestInfo(d).name,
        accessor: (r: FileRow) =>
          r.results[d]
            ? formatDigest(r.results[d]!, output)
            : r.status === 'hashing'
              ? 'Hashing'
              : r.status === 'cancelled'
                ? 'Cancelled'
                : (r.error ?? ''),
      })),
    ],
    [selected, output],
  );

  const done = rows.filter((r) => r.status === 'done');
  const checksums = alg ? toChecksumFile(done, alg) : '';

  return (
    <Stack gap="4">
      <DropZone
        variant="inline"
        multiple
        onFiles={hashFiles}
        title="Drop files to hash"
        hint="Any size: files are read in 4 MB slices on this device."
        chooseLabel="Choose files"
      />
      {rows.some((r) => r.status === 'error') && (
        <Alert status="danger">
          <AlertDescription>
            {rows
              .filter((r) => r.status === 'error')
              .map((r) => `${r.name}: ${r.error}`)
              .join('; ')}
          </AlertDescription>
        </Alert>
      )}
      {rows.length > 0 && (
        <>
          <Inline gap="2" align="center" wrap>
            <div className="w-48">
              <Select
                value={alg}
                onValueChange={(v) => setExportAlg(v as DigestId)}
                items={selected.map((d) => ({
                  value: d,
                  label: digestInfo(d).name,
                }))}
                aria-label="Checksum file algorithm"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<IconCopy size="sm" />}
              disabled={!checksums}
              onClick={() =>
                void copyText(checksums).then(() =>
                  notify.success('Checksums copied'),
                )
              }
            >
              Copy all
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<IconDownload size="sm" />}
              disabled={!checksums}
              onClick={() =>
                saveBlob(
                  new TextEncoder().encode(checksums),
                  `checksums.${checksumExtension(alg)}`,
                  'text/plain',
                )
              }
            >
              Download checksums
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRows([])}>
              Clear list
            </Button>
          </Inline>
          <DataGrid
            rows={rows}
            columns={columns}
            rowKey={(r) => r.id}
            ariaLabel="File hashes"
          />
          {done.length === 0 && (
            <Text size="sm" tone="subtle">
              Checksum files list finished files only.
            </Text>
          )}
        </>
      )}
    </Stack>
  );
};
