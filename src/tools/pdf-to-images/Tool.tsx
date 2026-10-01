import React, { useState } from 'react';
import { Images } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  Input,
  Label,
  NumberInput,
  Slider,
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
import {
  MAX_EXPORT_DPI,
  MIN_EXPORT_DPI,
  pdfRender,
  usePdfDocument,
  type DocInfo,
  type ImageFormat,
} from '@/pdf/render';
import {
  JobPanel,
  PageThumb,
  PdfFileHeader,
  ResultFiles,
  type ResultFile,
} from '@/pdf/components';
import { IMAGE_MIME, imageFileName, pagesToExport } from './lib/plan';
import { useImageExportSettings } from './store';

interface Snapshot {
  pages: string;
  format: ImageFormat;
  dpi: number;
  quality: number;
}

const clampDpi = (n: number) =>
  Math.min(MAX_EXPORT_DPI, Math.max(MIN_EXPORT_DPI, Math.round(n)));

const PdfToImagesTool: React.FC<ToolProps> = () => {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [pages, setPages] = useState('');
  const { format, dpi, quality, setFormat, setDpi, setQuality } =
    useImageExportSettings();
  const { doc, loading, error } = usePdfDocument(file);

  const job = useJob(
    async (
      ctx,
      source: LoadedFile,
      info: DocInfo,
      snap: Snapshot,
    ): Promise<ResultFile[]> => {
      const indices = pagesToExport(snap.pages, info.pageCount);
      const out: ResultFile[] = [];
      // Sequential on purpose: one full-size canvas in the worker at a time.
      for (const [i, pageIndex] of indices.entries()) {
        ctx.progress({
          done: i,
          total: indices.length,
          label: 'Rendering pages',
        });
        const img = await pdfRender.renderPageImage(
          info.docId,
          pageIndex,
          { dpi: snap.dpi, format: snap.format, quality: snap.quality },
          ctx.signal,
        );
        out.push({
          name: imageFileName(
            source.name,
            pageIndex,
            info.pageCount,
            snap.format,
          ),
          bytes: img.bytes,
          mime: IMAGE_MIME[snap.format],
          detail: `${img.width}×${img.height} px · ${img.dpi} DPI${
            img.capped ? ' (reduced to fit the size limit)' : ''
          }`,
        });
      }
      return out;
    },
  );

  const changed =
    <T,>(apply: (v: T) => void) =>
    (v: T) => {
      job.reset();
      apply(v);
    };
  const pick = (picked: LoadedFile) => {
    job.reset();
    setPages('');
    setFile(picked);
  };
  const clearFile = () => {
    job.reset();
    setFile(null);
  };

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          <PdfFileHeader
            file={file}
            onFile={pick}
            onClear={clearFile}
            loading={loading}
            error={error}
          />
          {file && doc && (
            <>
              <div className="flex items-center gap-3">
                <PageThumb
                  docId={doc.docId}
                  pageIndex={0}
                  page={doc.pages[0]}
                  width={56}
                  label="Page 1"
                />
                <Text size="sm" tone="muted">
                  {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                </Text>
              </div>
              <Stack gap="2">
                <Label>Format</Label>
                <Tabs
                  value={format}
                  onValueChange={(v) => changed(setFormat)(v as ImageFormat)}
                  variant="soft"
                >
                  <TabsList aria-label="Format">
                    <TabsTrigger value="png">PNG</TabsTrigger>
                    <TabsTrigger value="jpeg">JPEG</TabsTrigger>
                  </TabsList>
                </Tabs>
              </Stack>
              <Stack gap="2">
                <Label htmlFor="img-dpi">Resolution (DPI)</Label>
                <NumberInput
                  id="img-dpi"
                  value={dpi}
                  min={MIN_EXPORT_DPI}
                  max={MAX_EXPORT_DPI}
                  step={1}
                  onValueChange={(n) => {
                    if (!Number.isFinite(n)) return;
                    changed(setDpi)(clampDpi(n));
                  }}
                />
                <Text size="sm" tone="muted">
                  {MIN_EXPORT_DPI}–{MAX_EXPORT_DPI} DPI. Very large pages are
                  rendered at a lower resolution so they fit in memory; the
                  result says when.
                </Text>
              </Stack>
              {format === 'jpeg' && (
                <Stack gap="2">
                  <Label htmlFor="img-quality">JPEG quality</Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      id="img-quality"
                      value={quality}
                      min={0.5}
                      max={1}
                      step={0.05}
                      onValueChange={changed(setQuality)}
                    />
                    <span className="w-12 font-mono text-sm text-fg">
                      {Math.round(quality * 100)}%
                    </span>
                  </div>
                </Stack>
              )}
              <Stack gap="2">
                <Label htmlFor="img-pages">Pages</Label>
                <Input
                  id="img-pages"
                  value={pages}
                  onChange={changed(setPages)}
                  placeholder={`All ${doc.pageCount} pages (or e.g. 1-3, 5)`}
                />
              </Stack>
              <div>
                <Button
                  variant="solid"
                  leftIcon={<Images size={16} />}
                  disabled={job.status === 'running'}
                  onClick={() =>
                    job.run(file, doc, {
                      pages,
                      format,
                      dpi: clampDpi(dpi),
                      quality,
                    })
                  }
                >
                  Convert to images
                </Button>
              </div>
            </>
          )}
          <JobPanel
            job={job}
            onCancel={job.cancel}
            runningLabel="Rendering pages"
          >
            {job.result && file && (
              <ResultFiles
                files={job.result}
                zipName={deriveFilename(file.name, 'images', 'zip')}
              />
            )}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default PdfToImagesTool;
