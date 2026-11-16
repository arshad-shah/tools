import {
  Button,
  Card,
  Grid,
  GridItem,
  Notice,
  NumberField,
  SegmentedControl,
  Slider,
  Stack,
  TextField,
} from '@arshad-shah/cynosure';
import { images } from '@arshad-shah/cynosure/icons';
import { useMemo, useState } from 'react';
import type { PdfInputFile } from '@/pdf/intake/use-pdf-intake';
import {
  MAX_EXPORT_DPI,
  MIN_EXPORT_DPI,
  pdfRender,
  usePdfDocument,
  type DocInfo,
  type ImageFormat,
} from '@/pdf/render';
import { ChosenFile } from '@/pdf/ui/ChosenFile';
import { PageGrid } from '@/pdf/ui/PageGrid';
import { PdfIntake } from '@/pdf/ui/PdfIntake';
import { JobProgress, ResultCard, type ResultFile } from '@/pdf/ui/ResultCard';
import { deriveFilename } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';
import { useHandoff } from '@/shared/lib/handoff';
import { useJob } from '@/shared/state/useJob';
import {
  estimateExportBytes,
  IMAGE_MIME,
  imageFileName,
  LARGE_EXPORT_BYTES,
  pagesToExport,
} from './lib/plan';
import { useImageExportSettings } from './store';

interface Snapshot {
  pages: string;
  format: ImageFormat;
  dpi: number;
  quality: number;
}

const clampDpi = (n: number) =>
  Math.min(MAX_EXPORT_DPI, Math.max(MIN_EXPORT_DPI, Math.round(n)));

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * PDF to Images (redesign spec, file tool pattern): drop a PDF, see its
 * pages beside the image options, convert, download the images.
 */
export default function PdfToImagesTool() {
  const handed = useHandoff();
  const [file, setFile] = useState<PdfInputFile | null>(null);
  const [pages, setPages] = useState('');
  const { format, dpi, quality, setFormat, setDpi, setQuality } =
    useImageExportSettings();
  const { doc, loading, error } = usePdfDocument(file);

  // Which pages the button converts, and how much memory that needs.
  const plan = useMemo(() => {
    if (!doc) return null;
    try {
      const indices = pagesToExport(pages, doc.pageCount);
      return {
        indices,
        bytes: estimateExportBytes(doc.pages, indices, clampDpi(dpi)),
        error: null,
      };
    } catch (e) {
      return { indices: [], bytes: 0, error: toToolError(e).message };
    }
  }, [doc, pages, dpi]);

  const job = useJob(
    async (
      ctx,
      source: PdfInputFile,
      info: DocInfo,
      snap: Snapshot,
    ): Promise<ResultFile[]> => {
      const indices = pagesToExport(snap.pages, info.pageCount);
      const out: ResultFile[] = [];
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
          detail: `${img.width} by ${img.height} px at ${img.dpi} DPI${
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
  const busy = job.status === 'running';
  const count = plan?.indices.length ?? 0;

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
          onClear={() => {
            job.reset();
            setFile(null);
          }}
        />
      ) : (
        <PdfIntake
          initialFiles={handed}
          onFiles={(files) => {
            job.reset();
            setPages('');
            setFile(files[0]);
          }}
        />
      )}
      {error ? <Notice tone="danger">{error.message}</Notice> : null}

      {file && doc ? (
        <Grid columns={{ base: 1, lg: 3 }} gap="6" align="start">
          <GridItem span={{ base: 1, lg: 2 }} order={{ base: 2, lg: 1 }}>
            <Card as="section" title="Pages">
              <PageGrid doc={doc} />
            </Card>
          </GridItem>
          <GridItem order={{ base: 1, lg: 2 }}>
            <Card as="section" title="Images">
              <Stack gap="5">
                <SegmentedControl
                  label="Format"
                  value={format}
                  onChange={(v) => changed(setFormat)(v as ImageFormat)}
                  options={[
                    { value: 'png', label: 'PNG' },
                    { value: 'jpeg', label: 'JPEG' },
                  ]}
                />
                <NumberField
                  label="Resolution (DPI)"
                  description={`${MIN_EXPORT_DPI} to ${MAX_EXPORT_DPI}. Very large pages are rendered smaller so they fit in memory; the result says when.`}
                  value={dpi}
                  min={MIN_EXPORT_DPI}
                  max={MAX_EXPORT_DPI}
                  onChange={(n) => {
                    if (n !== null && Number.isFinite(n))
                      changed(setDpi)(clampDpi(n));
                  }}
                />
                {format === 'jpeg' ? (
                  <Slider
                    label="JPEG quality"
                    value={quality}
                    min={0.5}
                    max={1}
                    step={0.05}
                    showValue
                    onChange={(v) =>
                      typeof v === 'number' && changed(setQuality)(v)
                    }
                  />
                ) : null}
                <TextField
                  label="Pages to convert"
                  placeholder={`All ${doc.pageCount} (or e.g. 1-3, 5)`}
                  value={pages}
                  onChange={changed(setPages)}
                  error={plan?.error ?? undefined}
                />
                {plan && plan.bytes > LARGE_EXPORT_BYTES ? (
                  <Notice tone="warning">
                    This needs roughly {formatBytes(plan.bytes)} of memory while
                    the images wait to be downloaded. If your browser struggles,
                    convert fewer pages or use a lower resolution.
                  </Notice>
                ) : null}
                <JobProgress
                  job={job}
                  label="Rendering pages"
                  onCancel={job.cancel}
                />
                {busy ? null : (
                  <Button
                    variant="solid"
                    tone="accent"
                    size="lg"
                    fullWidth
                    icon={images}
                    disabled={count === 0}
                    onClick={() =>
                      void job.run(file, doc, {
                        pages,
                        format,
                        dpi: clampDpi(dpi),
                        quality,
                      })
                    }
                  >
                    {count
                      ? `Convert ${plural(count, 'page')} to ${format === 'png' ? 'PNG' : 'JPEG'}`
                      : 'Convert to images'}
                  </Button>
                )}
              </Stack>
            </Card>
          </GridItem>
        </Grid>
      ) : null}

      {job.status === 'done' && job.result && file ? (
        <ResultCard
          files={job.result}
          note={
            file.wasEncrypted
              ? 'The original was password-protected. These images are not'
              : undefined
          }
          zipName={deriveFilename(file.name, 'images', 'zip')}
        />
      ) : null}
    </Stack>
  );
}
