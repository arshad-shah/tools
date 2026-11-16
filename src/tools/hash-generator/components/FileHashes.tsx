import {
  Button,
  FileDrop,
  IconButton,
  Inline,
  Notice,
  ProgressBar,
  Select,
  Stack,
  Table,
  Text,
  type TableColumn,
} from '@arshad-shah/cynosure';
import { close, copy, download } from '@arshad-shah/cynosure/icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

  const columns = useMemo<TableColumn<FileRow>[]>(
    () => [
      {
        key: 'name',
        header: 'Name',
        rowHeader: true,
        cell: (r) => (
          <Text as="span" wrap="break">
            {r.name}
          </Text>
        ),
      },
      { key: 'size', header: 'Size', cell: (r) => formatBytes(r.size) },
      {
        key: 'progress',
        header: 'Progress',
        width: '12rem',
        cell: (r) =>
          r.status === 'hashing' ? (
            <Inline gap="2" align="center">
              <Stack grow>
                <ProgressBar
                  label={`Hashing ${r.name}`}
                  labelHidden
                  size="sm"
                  value={r.size ? r.done / r.size : 0}
                  max={1}
                  valueText={progressText(r)}
                />
              </Stack>
              <IconButton
                size="sm"
                variant="ghost"
                tone="neutral"
                icon={close}
                label={`Cancel ${r.name}`}
                onClick={() => jobs.current.get(r.id)?.abort()}
              />
            </Inline>
          ) : (
            progressText(r)
          ),
      },
      ...selected.map(
        (d): TableColumn<FileRow> => ({
          key: d,
          header: digestInfo(d).name,
          cell: (r) =>
            r.results[d] ? (
              <Text as="span" variant="code" size="sm" wrap="break">
                {formatDigest(r.results[d]!, output)}
              </Text>
            ) : r.status === 'hashing' ? (
              'Hashing'
            ) : r.status === 'cancelled' ? (
              'Cancelled'
            ) : (
              (r.error ?? '')
            ),
        }),
      ),
    ],
    [selected, output],
  );

  const done = rows.filter((r) => r.status === 'done');
  const checksums = alg ? toChecksumFile(done, alg) : '';
  const failed = rows.filter((r) => r.status === 'error');

  return (
    <Stack gap="6">
      <FileDrop
        multiple
        onFiles={hashFiles}
        hint="Any size: files are read in 4 MB slices on this device."
        labels={{ choose: 'Choose files' }}
      />
      {failed.length ? (
        <Notice tone="danger" title="Some files could not be hashed">
          {failed.map((r) => `${r.name}: ${r.error}`).join('; ')}
        </Notice>
      ) : null}
      {rows.length > 0 ? (
        <Stack gap="4">
          <Inline gap="3" align="end" wrap>
            <Select
              label="Checksum file algorithm"
              width="sm"
              value={alg}
              onChange={(v) => setExportAlg(v as DigestId)}
              options={selected.map((d) => ({
                value: d,
                label: digestInfo(d).name,
              }))}
            />
            <Button
              variant="soft"
              icon={copy}
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
              variant="soft"
              icon={download}
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
            <Button variant="ghost" onClick={() => setRows([])}>
              Clear list
            </Button>
          </Inline>
          <Table
            caption="File hashes"
            captionHidden
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            size="sm"
          />
          {done.length === 0 ? (
            <Text size="sm" tone="muted">
              Checksum files list finished files only.
            </Text>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
};
