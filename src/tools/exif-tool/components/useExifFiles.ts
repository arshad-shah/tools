import { useCallback, useRef, useState } from 'react';
import { deriveFilename, saveBlob, saveZip } from '@/shared/lib/download';
import { ToolError, type ToolErrorCode } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { newId } from '@/shared/lib/id';
import { notify } from '@/shared/lib/notify';
import { useJob, type JobContext } from '@/shared/state/useJob';
import { readMetadata, type Metadata } from '../lib/read';
import { assessRisk, type Risk } from '../lib/risk';
import { stripMetadata, type StripOptions } from '../lib/strip';

export type StripStatus = 'ready' | 'working' | 'done' | 'error';

export interface ExifEntry {
  id: string;
  file: File;
  /** Undefined while reading. */
  meta?: Metadata;
  risk?: Risk;
  readError?: string;
  status: StripStatus;
  /** Stripped bytes; only set when the strip verified clean. */
  output?: Uint8Array;
  removed?: string[];
  stripError?: { code: ToolErrorCode; message: string };
}

const MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** The output type for a downloaded file, from the sniffed format. */
export const mimeOf = (e: ExifEntry) =>
  (e.meta && MIME[e.meta.format]) || e.file.type || 'application/octet-stream';

const asError = (e: unknown) =>
  e instanceof ToolError
    ? { code: e.code, message: e.message }
    : { code: 'UNKNOWN' as const, message: 'Metadata could not be removed' };

/** The files of the EXIF tool: reading, stripping and downloads. */
export function useExifFiles() {
  const [entries, setEntries] = useState<ExifEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Clear bumps the generation so late reads and strips are dropped.
  const generation = useRef(0);

  const patch = useCallback(
    (gen: number, id: string, p: Partial<ExifEntry>) => {
      if (gen !== generation.current) return;
      setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...p } : e)));
    },
    [],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const gen = generation.current;
      const added = files.map<ExifEntry>((file) => ({
        id: newId(),
        file,
        status: 'ready',
      }));
      if (added.length === 0) return;
      setEntries((list) => [...list, ...added]);
      setSelectedId((cur) => cur ?? added[0].id);
      for (const entry of added)
        void (async () => {
          try {
            const meta = await readMetadata(await readBytes(entry.file));
            patch(gen, entry.id, { meta, risk: assessRisk(meta) });
          } catch (e) {
            patch(gen, entry.id, {
              readError:
                e instanceof ToolError
                  ? e.message
                  : 'The metadata could not be read',
            });
          }
        })();
    },
    [patch],
  );

  const job = useJob(
    async (ctx: JobContext, targets: ExifEntry[], opts: StripOptions) => {
      const gen = generation.current;
      let failed = 0;
      for (const [i, entry] of targets.entries()) {
        if (ctx.signal.aborted) throw new ToolError('CANCELLED', 'Cancelled');
        ctx.progress({ done: i, total: targets.length });
        try {
          const result = await stripMetadata(entry.file, opts);
          patch(gen, entry.id, {
            status: 'done',
            output: result.bytes,
            removed: result.removed,
          });
        } catch (e) {
          failed++;
          patch(gen, entry.id, { status: 'error', stripError: asError(e) });
        }
      }
      return { done: targets.length - failed, failed };
    },
  );
  const runJob = job.run;

  const strip = useCallback(
    async (opts: StripOptions) => {
      const targets = entries;
      if (targets.length === 0) return;
      setEntries((list) =>
        list.map((e) => ({
          ...e,
          status: 'working',
          output: undefined,
          removed: undefined,
          stripError: undefined,
        })),
      );
      const result = await runJob(targets, opts);
      if (!result) return;
      if (result.failed === 0)
        notify.success(
          result.done === 1
            ? 'Metadata removed from 1 file'
            : `Metadata removed from ${result.done} files`,
        );
      else
        notify.error(
          `${result.failed} of ${targets.length} files could not be cleaned`,
        );
    },
    [entries, runJob],
  );

  const doneEntries = entries.filter((e) => e.status === 'done' && e.output);

  const downloadZip = useCallback(async () => {
    if (doneEntries.length === 0) return;
    try {
      await saveZip(
        doneEntries.map((e) => ({ name: e.file.name, data: e.output! })),
        'metadata-removed.zip',
      );
    } catch (e) {
      notify.error(e instanceof ToolError ? e : 'Could not build the ZIP file');
    }
  }, [doneEntries]);

  const downloadOne = useCallback((entry: ExifEntry) => {
    if (entry.status !== 'done' || !entry.output) return;
    const ext =
      /\.([^./\\]+)$/.exec(entry.file.name)?.[1] ?? entry.meta?.format ?? 'bin';
    saveBlob(
      entry.output,
      deriveFilename(entry.file.name, 'clean', ext),
      mimeOf(entry),
    );
  }, []);

  const resetJob = job.reset;
  const clear = useCallback(() => {
    generation.current++;
    setEntries([]);
    setSelectedId(null);
    resetJob();
  }, [resetJob]);

  const selected =
    entries.find((e) => e.id === selectedId) ?? entries[0] ?? null;

  return {
    entries,
    selected,
    select: setSelectedId,
    addFiles,
    strip,
    running: job.status === 'running',
    doneEntries,
    downloadZip,
    downloadOne,
    clear,
  };
}

export type ExifFiles = ReturnType<typeof useExifFiles>;
