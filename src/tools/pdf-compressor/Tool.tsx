import {
  Badge,
  Button,
  Card,
  CodeBlock,
  DescriptionList,
  Disclosure,
  Grid,
  GridItem,
  List,
  Notice,
  NumberField,
  RadioGroup,
  Slider,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure';
import { fileCompress } from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import {
  browserCompressDeps,
  compressPdf,
  type CompressSettings,
  type PresetId,
} from '@/pdf/compress';
import type { CompressReport } from '@/pdf/compress/pipeline';
import type { PdfInputFile } from '@/pdf/intake/use-pdf-intake';
import { usePdfDocument } from '@/pdf/render';
import { ChosenFile } from '@/pdf/ui/ChosenFile';
import { PdfIntake } from '@/pdf/ui/PdfIntake';
import { JobProgress, ResultCard } from '@/pdf/ui/ResultCard';
import { deriveFilename } from '@/shared/lib/download';
import { formatBytes, formatSizeChange } from '@/shared/lib/format';
import { useHandoff } from '@/shared/lib/handoff';
import { useJob } from '@/shared/state/useJob';
import { fromAdvanced, type AdvancedSettings } from './lib/settings';
import { useCompressorSettings } from './store';

const PRESETS: { value: PresetId; label: string; description: string }[] = [
  {
    value: 'lossless',
    label: 'Lossless',
    description:
      'Restructures the file without touching images. Never lowers quality.',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description:
      'Images above 150 DPI are downsampled and saved as JPEG at 75%. Good for sharing.',
  },
  {
    value: 'strong',
    label: 'Strong',
    description:
      'Images above 96 DPI at 60%, and the document metadata removed. Smallest files.',
  },
];

type SwitchKey = Exclude<keyof AdvancedSettings, 'targetDpi' | 'quality'>;

const SWITCHES: { key: SwitchKey; label: string }[] = [
  { key: 'recompressImages', label: 'Recompress images' },
  { key: 'objectStreams', label: 'Generate object streams' },
  { key: 'recompressFlate', label: 'Recompress Flate streams' },
  { key: 'removeUnreferenced', label: 'Remove unreferenced objects' },
  { key: 'linearize', label: 'Linearize for fast web view' },
  { key: 'stripMetadata', label: 'Remove metadata (Info and XMP)' },
];

/** What each stage did, which images were touched, and qpdf's warnings. */
function Report({ report }: { report: CompressReport }) {
  const { images, warnings } = report;
  const skipped = images?.skipped.reduce((n, s) => n + s.count, 0) ?? 0;
  return (
    <Card as="section" title="What changed">
      <Stack gap="5">
        <DescriptionList
          size="sm"
          divided
          items={report.stages.map((s) => ({
            id: s.id,
            term: s.label,
            detail: `${formatBytes(s.before)} to ${formatBytes(s.after)} (${formatSizeChange(s.before, s.after)})`,
          }))}
        />
        {images ? (
          <Stack gap="3">
            <Text size="sm">
              Images: {images.processed} recompressed, {images.unchanged}{' '}
              already optimal, {skipped} left untouched.
            </Text>
            {images.grayToRgb > 0 ? (
              <Text size="sm" tone="muted">
                {images.grayToRgb === 1
                  ? '1 grayscale image was'
                  : `${images.grayToRgb} grayscale images were`}{' '}
                re-encoded as colour JPEG: browsers cannot write grayscale
                JPEGs.
              </Text>
            ) : null}
            {skipped > 0 ? (
              <List
                label="Left untouched"
                size="sm"
                items={images.skipped.map((s) => ({
                  id: s.reason,
                  label: `${s.reason} (${s.count})`,
                }))}
              />
            ) : null}
          </Stack>
        ) : null}
        {warnings.length ? (
          <Disclosure summary={`Warnings (${warnings.length})`} variant="line">
            <CodeBlock code={warnings.join('\n')} wrap size="sm" />
          </Disclosure>
        ) : null}
      </Stack>
    </Card>
  );
}

/**
 * PDF Compressor (redesign spec, file tool pattern): drop a PDF, pick a
 * preset (or tune the advanced settings), compress, and see what changed.
 */
export default function PdfCompressorTool() {
  // Files dropped on a hub land here once (spec §5.3).
  const handed = useHandoff();
  const [file, setFile] = useState<PdfInputFile | null>(null);
  const { preset, advanced, choosePreset, updateAdvanced } =
    useCompressorSettings();
  const { doc, loading, error } = usePdfDocument(file);

  const job = useJob((ctx, source: PdfInputFile, settings: CompressSettings) =>
    compressPdf(source.bytes, settings, browserCompressDeps, ctx),
  );
  const onAdvanced = (patch: Partial<AdvancedSettings>) => {
    job.reset();
    updateAdvanced(patch);
  };
  const busy = job.status === 'running';
  const result = job.status === 'done' ? job.result : null;
  const lastStage = result?.report.stages.at(-1);

  return (
    <Stack gap="6">
      {file ? (
        <ChosenFile
          name={file.name}
          size={file.size}
          detail={
            doc
              ? `${doc.pageCount} ${doc.pageCount === 1 ? 'page' : 'pages'}`
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
            setFile(files[0]);
          }}
        />
      )}
      {error ? <Notice tone="danger">{error.message}</Notice> : null}

      {file && doc ? (
        <Grid columns={{ base: 1, lg: 3 }} gap="6" align="start">
          <GridItem span={{ base: 1, lg: 2 }}>
            <Card as="section" title="How much to compress">
              <Stack gap="5">
                <RadioGroup
                  label="Preset"
                  description={
                    preset === 'custom'
                      ? 'Your own combination of the advanced settings.'
                      : undefined
                  }
                  variant="card"
                  columns={3}
                  value={preset === 'custom' ? '' : preset}
                  onChange={(v) => {
                    job.reset();
                    choosePreset(v as PresetId);
                  }}
                  options={PRESETS}
                />
                {preset === 'custom' ? (
                  <Badge tone="accent">Custom settings</Badge>
                ) : null}
                <Disclosure summary="Advanced settings" variant="line">
                  <Stack gap="4">
                    {SWITCHES.map(({ key, label }) => (
                      <Switch
                        key={key}
                        label={label}
                        checked={advanced[key]}
                        onChange={(v) => onAdvanced({ [key]: v })}
                      />
                    ))}
                    <NumberField
                      label="Target resolution (DPI)"
                      min={50}
                      max={600}
                      step={10}
                      value={advanced.targetDpi}
                      disabled={!advanced.recompressImages}
                      onChange={(v) =>
                        v !== null && onAdvanced({ targetDpi: v })
                      }
                    />
                    <Slider
                      label="JPEG quality"
                      min={0.3}
                      max={0.95}
                      step={0.05}
                      showValue
                      labels={{
                        value: (v: number) => `${Math.round(v * 100)}%`,
                      }}
                      value={advanced.quality}
                      disabled={!advanced.recompressImages}
                      onChange={(v) =>
                        typeof v === 'number' && onAdvanced({ quality: v })
                      }
                    />
                  </Stack>
                </Disclosure>
              </Stack>
            </Card>
          </GridItem>
          <Card as="section" title="Compress">
            <Stack gap="5">
              <DescriptionList
                size="sm"
                layout="inline"
                items={[
                  { term: 'Size now', detail: formatBytes(file.size) },
                  {
                    term: 'Preset',
                    detail:
                      preset === 'custom'
                        ? 'Custom'
                        : PRESETS.find((p) => p.value === preset)?.label,
                  },
                ]}
              />
              <JobProgress
                job={job}
                label="Compressing"
                onCancel={job.cancel}
              />
              {busy ? null : (
                <Button
                  variant="solid"
                  tone="accent"
                  size="lg"
                  fullWidth
                  icon={fileCompress}
                  onClick={() => void job.run(file, fromAdvanced(advanced))}
                >
                  Compress PDF
                </Button>
              )}
            </Stack>
          </Card>
        </Grid>
      ) : null}

      {result && file ? (
        <Stack gap="6">
          {result.report.keptOriginal ? (
            <Notice tone="info" title="Already optimised">
              The compressed version was not smaller (
              {formatBytes(result.report.inputSize)} to{' '}
              {formatBytes(lastStage?.after ?? result.report.inputSize)}), so
              your original is unchanged. There is nothing to download.
            </Notice>
          ) : (
            <ResultCard
              openInWorkspace
              inputSize={file.size}
              note={
                file.wasEncrypted
                  ? 'The original was password-protected. This file is not'
                  : undefined
              }
              files={[
                {
                  name: deriveFilename(file.name, 'compressed', 'pdf'),
                  bytes: result.bytes,
                },
              ]}
            />
          )}
          <Report report={result.report} />
        </Stack>
      ) : null}
    </Stack>
  );
}
