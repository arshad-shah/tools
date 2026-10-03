import React, { useMemo, useState } from 'react';
import { IconScissors } from '@/shared/ui/icons';
import {
  Button,
  Card,
  ControlBar,
  Inline,
  SegmentedControl,
  CardBody,
  Input,
  Label,
  NumberInput,
  Stack,
  Text,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import { deriveFilename } from '@/shared/lib/download';
import { useJob } from '@/shared/state/useJob';
import { extract, formatRange, rangesToIndices, split } from '@/pdf/edit';
import { usePdfDocument } from '@/pdf/render';
import {
  JobPanel,
  PageGrid,
  PdfFileHeader,
  ResultFiles,
  usePageSelection,
  type PageTile,
  type SelectionMods,
  type ResultFile,
  type PdfInputFile,
  UNENCRYPTED_NOTE,
} from '@/pdf/components';
import { planSplit, selectionLabel, type SplitMode } from './lib/plan';
import { useSplitterSettings } from './store';
import { useHandoff } from '@/shared/lib/handoff';

const MODES: { value: SplitMode; label: string }[] = [
  { value: 'selection', label: 'Select pages' },
  { value: 'ranges', label: 'Page ranges' },
  { value: 'every-n', label: 'Every N pages' },
  { value: 'individual', label: 'Every page' },
];

const PdfSplitterTool: React.FC<ToolProps> = () => {
  // Files dropped on a hub land here once (spec §5.3).
  const handed = useHandoff();
  const [file, setFile] = useState<PdfInputFile | null>(null);
  const [rangeText, setRangeText] = useState('');
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
  const keys = useMemo(() => tiles.map((t) => t.key), [tiles]);
  // Clicking pages builds up a selection; shift adds a range, ctrl toggles.
  const selection = usePageSelection(keys, { plain: 'toggle' });
  const { selected } = selection;

  const job = useJob(
    async (
      ctx,
      source: PdfInputFile,
      pageCount: number,
      snap: {
        mode: SplitMode;
        rangeText: string;
        everyN: number;
        selected: number[];
      },
    ): Promise<ResultFile[]> => {
      const { mode } = snap;
      const ranges = planSplit(mode, { ...snap, pageCount });
      if (mode === 'selection') {
        const indices = rangesToIndices(ranges);
        const label = selectionLabel(ranges);
        return [
          {
            name: deriveFilename(source.name, `pages-${label}`, 'pdf'),
            bytes: await extract(source.bytes, indices),
            detail: `${indices.length} pages`,
          },
        ];
      }
      const parts = await split(source.bytes, ranges, {
        onProgress: (done, total) =>
          ctx.progress({ done, total, label: 'Splitting' }),
      });
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

  const pick = (picked: PdfInputFile) => {
    job.reset();
    selection.clear();
    setFile(picked);
  };

  const clearFile = () => {
    job.reset();
    selection.clear();
    setFile(null);
  };
  const changeMode = (m: SplitMode) => {
    job.reset();
    setMode(m);
  };
  const changeRangeText = (v: string) => {
    job.reset();
    setRangeText(v);
  };
  const changeEveryN = (n: number) => {
    if (!Number.isFinite(n)) return;
    job.reset();
    setEveryN(Math.max(1, Math.floor(n)));
  };
  const selectAll = () => {
    job.reset();
    selection.selectAll();
  };
  const clearSelection = () => {
    job.reset();
    selection.clear();
  };
  const toggle = (key: string, mods: SelectionMods) => {
    job.reset();
    selection.toggle(key, mods);
  };

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          <PdfFileHeader
            initialFiles={handed}
            file={file}
            onFile={pick}
            onClear={clearFile}
            loading={loading}
            error={error}
          />
          {file && doc && (
            <>
              <ControlBar
                tone="inset"
                start={
                  <SegmentedControl<SplitMode>
                    label="Split mode"
                    size="sm"
                    value={mode}
                    onChange={changeMode}
                    options={MODES}
                  />
                }
                end={
                  mode === 'ranges' ? (
                    <Inline gap="2" align="center" wrap={false}>
                      <Label htmlFor="split-ranges">Ranges</Label>
                      <div className="w-56">
                        <Input
                          id="split-ranges"
                          value={rangeText}
                          onChange={changeRangeText}
                          placeholder="e.g. 1-3, 4-6, 10-"
                        />
                      </div>
                    </Inline>
                  ) : mode === 'every-n' ? (
                    <Inline gap="2" align="center" wrap={false}>
                      <Label htmlFor="split-every">Pages per file</Label>
                      <NumberInput
                        id="split-every"
                        className="w-32"
                        value={everyN}
                        onValueChange={changeEveryN}
                        min={1}
                        max={doc.pageCount}
                      />
                    </Inline>
                  ) : mode === 'selection' ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={selected.size === 0}
                        onClick={clearSelection}
                      >
                        Clear selection
                      </Button>
                      <Button size="sm" variant="secondary" onClick={selectAll}>
                        Select all
                      </Button>
                    </>
                  ) : null
                }
                footer={
                  <Text size="sm" tone="muted">
                    {mode === 'ranges'
                      ? `Each range becomes its own file. ${doc.pageCount} pages in total.`
                      : mode === 'every-n'
                        ? `Every ${everyN} ${everyN === 1 ? 'page becomes' : 'pages become'} a file.`
                        : mode === 'individual'
                          ? `Creates ${doc.pageCount} single-page files.`
                          : `Click pages to select them (Shift-click selects a range). They are extracted into one new PDF (${selected.size} selected).`}
                  </Text>
                }
              />
              <PageGrid
                doc={doc}
                tiles={tiles}
                selected={mode === 'selection' ? selected : undefined}
                onToggle={mode === 'selection' ? toggle : undefined}
              />
              <Button
                variant="primary"
                className="self-start"
                leftIcon={<IconScissors size="sm" />}
                disabled={job.status === 'running'}
                onClick={() =>
                  job.run(file, doc.pageCount, {
                    mode,
                    rangeText,
                    everyN,
                    selected: [...selected].map(Number),
                  })
                }
              >
                Split PDF
              </Button>
            </>
          )}
          <JobPanel job={job} onCancel={job.cancel} runningLabel="Splitting">
            {job.result && (
              <ResultFiles
                openInWorkspace
                note={file?.wasEncrypted ? UNENCRYPTED_NOTE : undefined}
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
