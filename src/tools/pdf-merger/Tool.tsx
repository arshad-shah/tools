import React, { useState } from 'react';
import { IconMerge } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  Inline,
  Input,
  Spinner,
  Stack,
  Text,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import { logToolError, ToolError, toToolError } from '@/shared/lib/errors';
import { deriveFilename } from '@/shared/lib/download';
import { useJob } from '@/shared/state/useJob';
import {
  getPageCount,
  merge,
  parsePageRanges,
  rangesToIndices,
} from '@/pdf/edit';
import {
  FileThumb,
  JobPanel,
  PdfDropzone,
  ResultFiles,
  SortableFileList,
  type ResultFile,
  type PdfInputFile,
  UNENCRYPTED_NOTE,
} from '@/pdf/components';
import { insertByOrder } from './lib/order';
import { useHandoff } from '@/shared/lib/handoff';

interface MergeItem extends PdfInputFile {
  pageCount: number;
  /** Blank = all pages. 1-based range syntax. */
  pages: string;
}

const PdfMergerTool: React.FC<ToolProps> = () => {
  // Files dropped on a hub land here once (spec §5.3).
  const handed = useHandoff();
  const [items, setItems] = useState<MergeItem[]>([]);
  const [addErrors, setAddErrors] = useState<string[]>([]);
  /** Number of files being read after a drop (0 = idle). */
  const [reading, setReading] = useState(0);
  const job = useJob(async (ctx, list: MergeItem[]): Promise<ResultFile> => {
    const inputs = list.map((item) => {
      if (!item.pages.trim()) return { bytes: item.bytes, pages: undefined };
      try {
        return {
          bytes: item.bytes,
          pages: rangesToIndices(parsePageRanges(item.pages, item.pageCount)),
        };
      } catch (err) {
        const e = toToolError(err);
        throw new ToolError(e.code, `${item.name}: ${e.message}`, {
          cause: err,
        });
      }
    });
    // Until the first input is done JobPanel shows its indeterminate text.
    const bytes = await merge(inputs, {
      onProgress: (done, total) =>
        ctx.progress({ done, total, label: 'Merging' }),
    });
    const total = inputs.reduce(
      (n, inp, i) => n + (inp.pages?.length ?? list[i].pageCount),
      0,
    );
    return {
      name: deriveFilename(list[0].name, 'merged', 'pdf'),
      bytes,
      detail: `${total} pages`,
    };
  });

  const add = async (files: PdfInputFile[]) => {
    job.reset();
    // pdf-lib reads each file on the main thread to count pages (encrypted
    // files arrive already decrypted by PdfDropzone); show that it's working.
    setReading(files.length);
    const results = await Promise.allSettled(
      files.map(async (f) => ({
        ...f,
        pageCount: await getPageCount(f.bytes),
        pages: '',
      })),
    );
    const ok: MergeItem[] = [];
    const errors: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') ok.push(r.value);
      else {
        const error = toToolError(r.reason);
        logToolError(error);
        errors.push(`${files[i].name}: ${error.message}`);
      }
    });
    setReading(0);
    setAddErrors(errors);
    // A file unlocked after its siblings goes back to its drop position.
    setItems((prev) => insertByOrder(prev, ok));
  };
  const busy = job.status === 'running';

  const update = (next: MergeItem[]) => {
    job.reset();
    setItems(next);
  };

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          <PdfDropzone
            initialFiles={handed}
            multiple
            onFiles={add}
            disabled={busy || reading > 0}
          />
          {reading > 0 && (
            <Inline gap="2" align="center" aria-live="polite">
              <Spinner size="sm" />
              <Text size="sm" tone="muted">
                Reading {reading} {reading === 1 ? 'file' : 'files'}…
              </Text>
            </Inline>
          )}
          {addErrors.length > 0 && (
            <Alert status="danger">
              {addErrors.map((m, i) => (
                <AlertDescription key={i}>{m}</AlertDescription>
              ))}
            </Alert>
          )}
          {items.length > 0 && (
            <>
              <Text size="sm" tone="muted">
                Drag files, or focus one and press Alt + Up/Down, to set the
                order. Leave pages blank to include the whole file, or enter
                ranges like 1-3, 5.
              </Text>
              <SortableFileList
                items={items}
                disabled={busy}
                onReorder={update}
                onRemove={(id) => update(items.filter((i) => i.id !== id))}
                renderPreview={(item) => (
                  <FileThumb bytes={item.bytes} name={item.name} />
                )}
                renderExtra={(item) => (
                  <Inline gap="3" align="center">
                    <Text size="xs" tone="muted" className="shrink-0">
                      {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                    </Text>
                    <div className="w-40">
                      <Input
                        disabled={busy}
                        value={item.pages}
                        onChange={(pages) =>
                          update(
                            items.map((i) =>
                              i.id === item.id ? { ...i, pages } : i,
                            ),
                          )
                        }
                        placeholder={`All ${item.pageCount} pages`}
                        aria-label={`Pages from ${item.name}`}
                      />
                    </div>
                  </Inline>
                )}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  leftIcon={<IconMerge size="sm" />}
                  disabled={items.length < 2 || busy || reading > 0}
                  onClick={() => job.run(items)}
                >
                  Merge PDFs
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setAddErrors([]);
                    update([]);
                  }}
                >
                  Clear
                </Button>
              </div>
              {items.length < 2 && (
                <Text size="sm" tone="muted">
                  Add at least two PDFs to merge.
                </Text>
              )}
            </>
          )}
          <JobPanel job={job} onCancel={job.cancel} runningLabel="Merging">
            {job.result && (
              <ResultFiles
                files={[job.result]}
                note={
                  items.some((i) => i.wasEncrypted)
                    ? UNENCRYPTED_NOTE
                    : undefined
                }
              />
            )}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default PdfMergerTool;
