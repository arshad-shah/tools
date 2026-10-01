import React, { useMemo, useState } from 'react';
import { Scissors } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  Input,
  Label,
  NumberInput,
  Stack,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import type { LoadedFile } from '@/shared/lib/files';
import { deriveFilename } from '@/shared/lib/download';
import { useJob } from '@/shared/state/useJob';
import { extract, formatRange, rangesToIndices, split } from '@/pdf/edit';
import { usePdfDocument } from '@/pdf/render';
import {
  JobPanel,
  PageGrid,
  PdfDropzone,
  ResultFiles,
  type PageTile,
  type ResultFile,
} from '@/pdf/components';
import { planSplit, type SplitMode } from './lib/plan';
import { useSplitterSettings } from './store';

const MODES: { value: SplitMode; label: string }[] = [
  { value: 'selection', label: 'Select pages' },
  { value: 'ranges', label: 'Page ranges' },
  { value: 'every-n', label: 'Every N pages' },
  { value: 'individual', label: 'Every page' },
];

const PdfSplitterTool: React.FC<ToolProps> = () => {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [rangeText, setRangeText] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { mode, everyN, setMode, setEveryN } = useSplitterSettings();
  const { doc, loading, error } = usePdfDocument(file);

  const tiles = useMemo<PageTile[]>(
    () =>
      doc
        ? Array.from({ length: doc.pageCount }, (_, i) => ({
            key: String(i),
            pageIndex: i,
            rotation: 0,
          }))
        : [],
    [doc],
  );

  const job = useJob(
    async (
      ctx,
      source: LoadedFile,
      pageCount: number,
    ): Promise<ResultFile[]> => {
      const ranges = planSplit(mode, {
        pageCount,
        rangeText,
        everyN,
        selected: [...selected].map(Number),
      });
      if (mode === 'selection') {
        const indices = rangesToIndices(ranges);
        const label = ranges.map(formatRange).join('_');
        return [
          {
            name: deriveFilename(source.name, `pages-${label}`, 'pdf'),
            bytes: await extract(source.bytes, indices),
            detail: `${indices.length} pages`,
          },
        ];
      }
      ctx.progress({ done: 0, total: ranges.length, label: 'Splitting' });
      const parts = await split(source.bytes, ranges);
      return parts.map((bytes, i) => ({
        name: deriveFilename(
          source.name,
          `pages-${formatRange(ranges[i])}`,
          'pdf',
        ),
        bytes,
        detail: `${ranges[i].end - ranges[i].start + 1} pages`,
      }));
    },
  );

  const pick = (files: LoadedFile[]) => {
    job.reset();
    setSelected(new Set());
    setFile(files[0]);
  };

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          {!file ? (
            <PdfDropzone onFiles={pick} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Text weight="semibold">{file.name}</Text>
              <Button size="sm" variant="ghost" onClick={() => setFile(null)}>
                Choose another file
              </Button>
            </div>
          )}
          {loading && <Text tone="muted">Opening…</Text>}
          {error && (
            <Alert status="danger">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          {file && doc && (
            <>
              <Tabs
                value={mode}
                onValueChange={(v) => setMode(v as SplitMode)}
                variant="soft"
              >
                <TabsList>
                  {MODES.map((m) => (
                    <TabsTrigger key={m.value} value={m.value}>
                      {m.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              {mode === 'ranges' && (
                <Stack gap="2">
                  <Label htmlFor="split-ranges">Ranges</Label>
                  <Input
                    id="split-ranges"
                    value={rangeText}
                    onChange={setRangeText}
                    placeholder="e.g. 1-3, 4-6, 10-"
                    aria-label="Ranges"
                  />
                  <Text size="sm" tone="muted">
                    Each range becomes its own file. {doc.pageCount} pages in
                    total.
                  </Text>
                </Stack>
              )}
              {mode === 'every-n' && (
                <Stack gap="2">
                  <Label htmlFor="split-every">Pages per file</Label>
                  <NumberInput
                    id="split-every"
                    value={everyN}
                    onValueChange={setEveryN}
                    min={1}
                    max={doc.pageCount}
                  />
                </Stack>
              )}
              {mode === 'individual' && (
                <Text size="sm" tone="muted">
                  Creates {doc.pageCount} single-page files.
                </Text>
              )}
              {mode === 'selection' && (
                <Text size="sm" tone="muted">
                  Click pages to select them. They are extracted into one new
                  PDF ({selected.size} selected).
                </Text>
              )}
              <PageGrid
                doc={doc}
                tiles={tiles}
                selected={mode === 'selection' ? selected : undefined}
                onToggle={mode === 'selection' ? toggle : undefined}
              />
              <Button
                variant="solid"
                leftIcon={<Scissors size={16} />}
                disabled={job.status === 'running'}
                onClick={() => job.run(file, doc.pageCount)}
              >
                Split PDF
              </Button>
            </>
          )}
          <JobPanel job={job} onCancel={job.cancel} runningLabel="Splitting">
            {job.result && (
              <ResultFiles
                files={job.result}
                zipName={
                  file ? deriveFilename(file.name, 'split', 'zip') : 'split.zip'
                }
              />
            )}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default PdfSplitterTool;
