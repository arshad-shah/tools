import React, { useState } from 'react';
import { Merge } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  Input,
  Stack,
  Text,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import type { LoadedFile } from '@/shared/lib/files';
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
} from '@/pdf/components';

interface MergeItem extends LoadedFile {
  pageCount: number;
  /** Blank = all pages. 1-based range syntax. */
  pages: string;
}

const PdfMergerTool: React.FC<ToolProps> = () => {
  const [items, setItems] = useState<MergeItem[]>([]);
  const [addErrors, setAddErrors] = useState<string[]>([]);
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

  const add = async (files: LoadedFile[]) => {
    job.reset();
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
    setAddErrors(errors);
    setItems((prev) => [...prev, ...ok]);
  };

  const update = (next: MergeItem[]) => {
    job.reset();
    setItems(next);
  };

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          <PdfDropzone multiple onFiles={add} />
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
                onReorder={update}
                onRemove={(id) => update(items.filter((i) => i.id !== id))}
                renderPreview={(item) => (
                  <FileThumb bytes={item.bytes} name={item.name} />
                )}
                renderExtra={(item) => (
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 text-xs text-fg-muted">
                      {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                    </span>
                    <div className="w-40">
                      <Input
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
                  </div>
                )}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="solid"
                  leftIcon={<Merge size={16} />}
                  disabled={items.length < 2 || job.status === 'running'}
                  onClick={() => job.run(items)}
                >
                  Merge PDFs
                </Button>
                <Button
                  variant="ghost"
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
            {job.result && <ResultFiles files={[job.result]} />}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default PdfMergerTool;
