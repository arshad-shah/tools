import {
  Button,
  Card,
  Grid,
  GridItem,
  Inline,
  NumberField,
  RadioGroup,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { pageSplit } from '@arshad-shah/cynosure/icons';
import { useMemo, useState } from 'react';
import { extract, formatRange, rangesToIndices, split } from '@/pdf/edit';
import type { PdfInputFile } from '@/pdf/intake/use-pdf-intake';
import { usePdfDocument } from '@/pdf/render';
import { ChosenFile } from '@/pdf/ui/ChosenFile';
import { PageGrid } from '@/pdf/ui/PageGrid';
import { PdfIntake } from '@/pdf/ui/PdfIntake';
import { JobProgress, ResultCard, type ResultFile } from '@/pdf/ui/ResultCard';
import { deriveFilename } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { useHandoff } from '@/shared/lib/handoff';
import { useJob } from '@/shared/state/useJob';
import { planSplit, selectionLabel, type SplitMode } from './lib/plan';
import { useSplitterSettings } from './store';

const MODES: { value: SplitMode; label: string; description: string }[] = [
  {
    value: 'selection',
    label: 'Pick pages',
    description: 'The pages you tick become one new PDF.',
  },
  {
    value: 'ranges',
    label: 'Page ranges',
    description: 'Each range becomes its own file.',
  },
  {
    value: 'every-n',
    label: 'Every N pages',
    description: 'A new file every few pages.',
  },
  {
    value: 'individual',
    label: 'Every page',
    description: 'One file per page.',
  },
];

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * PDF Splitter (redesign spec, file tool pattern): drop a PDF, see its
 * pages beside the split options, split with one button that says what it
 * makes, then download the files.
 */
export default function PdfSplitterTool() {
  // Files dropped on a hub land here once (spec §5.3).
  const handed = useHandoff();
  const [file, setFile] = useState<PdfInputFile | null>(null);
  const [rangeText, setRangeText] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const { mode, everyN, setMode, setEveryN } = useSplitterSettings();
  const { doc, loading, error } = usePdfDocument(file);

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
      const ranges = planSplit(snap.mode, { ...snap, pageCount });
      if (snap.mode === 'selection') {
        const indices = rangesToIndices(ranges);
        return [
          {
            name: deriveFilename(
              source.name,
              `pages-${selectionLabel(ranges)}`,
              'pdf',
            ),
            bytes: await extract(source.bytes, indices),
            detail: plural(indices.length, 'page'),
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
        detail: plural(ranges[i].end - ranges[i].start + 1, 'page'),
      }));
    },
  );

  const reset =
    <A extends unknown[]>(f: (...a: A) => void) =>
    (...a: A) => {
      job.reset();
      f(...a);
    };
  const choose = reset((picked: PdfInputFile) => {
    setSelected(new Set());
    setFile(picked);
  });
  const [anchor, setAnchor] = useState<number | null>(null);
  const toggle = reset((index: number, checked: boolean, range: boolean) => {
    const next = new Set(selected);
    // Shift: every page from the last one ticked to this one.
    const from = range && anchor !== null ? Math.min(anchor, index) : index;
    const to = range && anchor !== null ? Math.max(anchor, index) : index;
    for (let i = from; i <= to; i++)
      if (checked) next.add(i);
      else next.delete(i);
    setAnchor(index);
    setSelected(next);
  });

  // What the button makes, worked out as the options change.
  const plan = useMemo(() => {
    if (!doc) return null;
    try {
      const ranges = planSplit(mode, {
        pageCount: doc.pageCount,
        rangeText,
        everyN,
        selected: [...selected],
      });
      return { ranges, error: null };
    } catch (e) {
      return { ranges: [], error: toToolError(e).message };
    }
  }, [doc, mode, rangeText, everyN, selected]);
  const action = !plan?.ranges.length
    ? 'Split PDF'
    : mode === 'selection'
      ? `Extract ${plural(rangesToIndices(plan.ranges).length, 'page')}`
      : `Split into ${plural(plan.ranges.length, 'file')}`;
  const busy = job.status === 'running';

  return (
    <Stack gap="6">
      {file ? (
        <ChosenFile
          name={file.name}
          size={file.size}
          detail={
            doc
              ? plural(doc.pageCount, 'page')
              : loading
                ? 'Opening'
                : undefined
          }
          disabled={busy}
          onClear={reset(() => {
            setSelected(new Set());
            setFile(null);
          })}
        />
      ) : (
        <PdfIntake
          initialFiles={handed}
          onFiles={(files) => choose(files[0])}
        />
      )}
      {error ? <Text tone="danger">{error.message}</Text> : null}

      {file && doc ? (
        <Grid columns={{ base: 1, lg: 3 }} gap="6" align="start">
          <GridItem span={{ base: 1, lg: 2 }} order={{ base: 2, lg: 1 }}>
            <Card
              as="section"
              title="Pages"
              description={
                mode === 'selection'
                  ? `Tick the pages to extract (${selected.size} selected).`
                  : undefined
              }
            >
              <PageGrid
                doc={doc}
                selected={mode === 'selection' ? selected : undefined}
                onToggle={mode === 'selection' ? toggle : undefined}
              />
            </Card>
          </GridItem>
          <GridItem order={{ base: 1, lg: 2 }}>
            <Card as="section" title="Split">
              <Stack gap="5">
                <RadioGroup
                  label="Split mode"
                  labelHidden
                  value={mode}
                  onChange={reset((v: string) => setMode(v as SplitMode))}
                  options={MODES}
                />
                {mode === 'ranges' ? (
                  <TextField
                    label="Ranges"
                    description={`Separate ranges with commas. ${plural(doc.pageCount, 'page')} in total.`}
                    placeholder="1-3, 4-6, 10-"
                    value={rangeText}
                    onChange={reset(setRangeText)}
                    error={
                      rangeText.trim() ? (plan?.error ?? undefined) : undefined
                    }
                  />
                ) : mode === 'every-n' ? (
                  <NumberField
                    label="Pages per file"
                    min={1}
                    max={doc.pageCount}
                    value={everyN}
                    onChange={reset((n: number | null) => {
                      if (n !== null && Number.isFinite(n))
                        setEveryN(Math.max(1, Math.floor(n)));
                    })}
                  />
                ) : mode === 'selection' ? (
                  <Inline gap="2" wrap>
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={reset(() =>
                        setSelected(
                          new Set(
                            Array.from({ length: doc.pageCount }, (_, i) => i),
                          ),
                        ),
                      )}
                    >
                      Select all
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={selected.size === 0}
                      onClick={reset(() => setSelected(new Set()))}
                    >
                      Clear selection
                    </Button>
                  </Inline>
                ) : null}
                <JobProgress
                  job={job}
                  label="Splitting"
                  onCancel={job.cancel}
                />
                {busy ? null : (
                  <Button
                    variant="solid"
                    tone="accent"
                    size="lg"
                    fullWidth
                    icon={pageSplit}
                    disabled={!plan?.ranges.length}
                    onClick={() =>
                      void job.run(file, doc.pageCount, {
                        mode,
                        rangeText,
                        everyN,
                        selected: [...selected],
                      })
                    }
                  >
                    {action}
                  </Button>
                )}
              </Stack>
            </Card>
          </GridItem>
        </Grid>
      ) : null}

      {job.status === 'done' && job.result ? (
        <ResultCard
          files={job.result}
          openInWorkspace
          note={
            file?.wasEncrypted
              ? 'The original was password-protected. This file is not'
              : undefined
          }
          zipName={
            file ? deriveFilename(file.name, 'split', 'zip') : 'split.zip'
          }
        />
      ) : null}
    </Stack>
  );
}
