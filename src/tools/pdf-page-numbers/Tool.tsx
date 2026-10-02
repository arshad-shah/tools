import React, { useCallback, useMemo, useState } from 'react';
import { IconListOrdered } from '@/shared/ui/icons';
import {
  Button,
  Card,
  CardBody,
  Inline,
  Label,
  NumberInput,
  Select,
  Stack,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import { deriveFilename } from '@/shared/lib/download';
import { useJob } from '@/shared/state/useJob';
import {
  EDGE_ANCHOR_OPTIONS,
  pageNumbers,
  trySelectPages,
  type EdgeAnchor,
  type PageNumberFormat,
  type PageNumberOptions,
} from '@/pdf/edit';
import { usePdfDocument } from '@/pdf/render';
import {
  JobPanel,
  PdfFileHeader,
  PageRangeField,
  PdfPagePreview,
  ResultFiles,
  usePreviewBytes,
  type ResultFile,
  type PdfInputFile,
  UNENCRYPTED_NOTE,
} from '@/pdf/components';
import { usePageNumberSettings } from './store';
import { useHandoff } from '@/shared/lib/handoff';

const MARGIN = 28;

const FORMAT_ITEMS: { value: PageNumberFormat; label: string }[] = [
  { value: 'n', label: '1, 2, 3' },
  { value: 'n-of-total', label: '1 / 10' },
  { value: 'page-n', label: 'Page 1' },
];

type NumberSettings = Omit<PageNumberOptions, 'pages' | 'total'>;

const PdfPageNumbersTool: React.FC<ToolProps> = () => {
  // Files dropped on a hub land here once (spec §5.3).
  const handed = useHandoff();
  const [file, setFile] = useState<PdfInputFile | null>(null);
  const [pageMode, setPageMode] = useState<'all' | 'ranges'>('all');
  const [rangeText, setRangeText] = useState('');
  const s = usePageNumberSettings();
  const { doc, loading, error } = usePdfDocument(file);

  const selection = useMemo(
    () =>
      doc
        ? trySelectPages(
            pageMode === 'all'
              ? { mode: 'all' }
              : { mode: 'ranges', text: rangeText },
            doc.pageCount,
          )
        : { pages: [], error: null },
    [doc, pageMode, rangeText],
  );

  const settings = useMemo<NumberSettings>(
    () => ({
      format: s.format,
      position: s.position,
      startAt: s.startAt,
      fontSize: s.fontSize,
      margin: MARGIN,
    }),
    [s.format, s.position, s.startAt, s.fontSize],
  );

  const previewPage = selection.pages[0] ?? 0;
  const total = s.startAt + Math.max(selection.pages.length, 1) - 1;
  const buildPreview = useCallback(
    (page: Uint8Array) => pageNumbers(page, { ...settings, pages: [0], total }),
    [settings, total],
  );
  const preview = usePreviewBytes(
    file?.bytes ?? null,
    previewPage,
    JSON.stringify({ ...settings, total }),
    buildPreview,
  );

  const job = useJob(
    async (
      _ctx,
      source: PdfInputFile,
      opts: PageNumberOptions,
    ): Promise<ResultFile[]> => {
      const bytes = await pageNumbers(source.bytes, opts);
      return [
        {
          name: deriveFilename(source.name, 'numbered', 'pdf'),
          bytes,
          detail: `${opts.pages.length} ${opts.pages.length === 1 ? 'page' : 'pages'} numbered`,
        },
      ];
    },
  );

  const change =
    <T,>(fn: (v: T) => void) =>
    (v: T) => {
      job.reset();
      fn(v);
    };
  const wholeNumber = (fn: (n: number) => void) =>
    change((n: number) => {
      if (Number.isFinite(n)) fn(Math.floor(n));
    });

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          <PdfFileHeader
            initialFiles={handed}
            file={file}
            onFile={change(setFile)}
            onClear={() => {
              job.reset();
              setFile(null);
            }}
            loading={loading}
            error={error}
          />
          {file && doc && (
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
              <Stack gap="4">
                <Inline gap="4" wrap>
                  <Stack gap="2" className="min-w-40 flex-1">
                    <Label htmlFor="pn-format">Format</Label>
                    <Select
                      id="pn-format"
                      value={s.format}
                      items={FORMAT_ITEMS}
                      onValueChange={change((v: string) =>
                        s.setFormat(v as PageNumberFormat),
                      )}
                    />
                  </Stack>
                  <Stack gap="2" className="min-w-40 flex-1">
                    <Label htmlFor="pn-position">Position</Label>
                    <Select
                      id="pn-position"
                      value={s.position}
                      items={EDGE_ANCHOR_OPTIONS}
                      onValueChange={change((v: string) =>
                        s.setPosition(v as EdgeAnchor),
                      )}
                    />
                  </Stack>
                </Inline>
                <Inline gap="4" wrap>
                  <Stack gap="2">
                    <Label htmlFor="pn-start">Start at</Label>
                    <NumberInput
                      id="pn-start"
                      value={s.startAt}
                      min={0}
                      max={9999}
                      onValueChange={wholeNumber(s.setStartAt)}
                    />
                  </Stack>
                  <Stack gap="2">
                    <Label htmlFor="pn-size">Font size</Label>
                    <NumberInput
                      id="pn-size"
                      value={s.fontSize}
                      min={6}
                      max={72}
                      onValueChange={wholeNumber(s.setFontSize)}
                    />
                  </Stack>
                </Inline>
                <PageRangeField
                  id="pn"
                  mode={pageMode}
                  text={rangeText}
                  onModeChange={change(setPageMode)}
                  onTextChange={change(setRangeText)}
                  error={selection.error}
                />
                <Button
                  variant="primary"
                  leftIcon={<IconListOrdered size="sm" />}
                  disabled={
                    job.status === 'running' || selection.error !== null
                  }
                  onClick={() =>
                    job.run(file, { ...settings, pages: selection.pages })
                  }
                >
                  Add page numbers
                </Button>
              </Stack>
              <PdfPagePreview
                bytes={preview.bytes}
                width={260}
                label="Page number preview"
                caption={`Preview on page ${previewPage + 1}`}
                pending={preview.pending}
                error={preview.error}
              />
            </div>
          )}
          <JobPanel job={job} onCancel={job.cancel} runningLabel="Numbering">
            {job.result && (
              <ResultFiles
                note={file?.wasEncrypted ? UNENCRYPTED_NOTE : undefined}
                files={job.result}
              />
            )}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default PdfPageNumbersTool;
