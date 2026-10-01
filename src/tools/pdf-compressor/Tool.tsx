import React, { useState } from 'react';
import { Minimize2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardBody,
  Inline,
  Label,
  NumberInput,
  Slider,
  Stack,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import { deriveFilename } from '@/shared/lib/download';
import { formatBytes, formatSizeChange } from '@/shared/lib/format';
import { useJob } from '@/shared/state/useJob';
import { usePdfDocument } from '@/pdf/render';
import {
  JobPanel,
  PageThumb,
  PdfFileHeader,
  ResultFiles,
  type PdfInputFile,
  UNENCRYPTED_NOTE,
} from '@/pdf/components';
import {
  browserCompressDeps,
  compressPdf,
  type CompressSettings,
  type PresetId,
} from '@/pdf/compress';
import { CompressReportView } from './components/CompressReportView';
import { fromAdvanced, type AdvancedSettings } from './lib/settings';
import { useCompressorSettings } from './store';

const PRESET_LABELS: Record<PresetId, string> = {
  lossless: 'Lossless',
  balanced: 'Balanced',
  strong: 'Strong',
};

const PRESET_DESCRIPTIONS: Record<PresetId, string> = {
  lossless:
    'Restructures the file without touching images. Never lowers quality.',
  balanced:
    'Downsamples images above 150 DPI and re-encodes them as JPEG at 75% quality. Good for sharing.',
  strong:
    'Downsamples images above 96 DPI at 60% quality and removes document metadata. Smallest files.',
};

type SwitchKey = Exclude<keyof AdvancedSettings, 'targetDpi' | 'quality'>;

const SWITCHES: { key: SwitchKey; id: string; label: string }[] = [
  { key: 'recompressImages', id: 'cmp-images', label: 'Recompress images' },
  {
    key: 'objectStreams',
    id: 'cmp-objstm',
    label: 'Generate object streams',
  },
  {
    key: 'recompressFlate',
    id: 'cmp-flate',
    label: 'Recompress Flate streams',
  },
  {
    key: 'removeUnreferenced',
    id: 'cmp-unref',
    label: 'Remove unreferenced objects',
  },
  {
    key: 'linearize',
    id: 'cmp-linearize',
    label: 'Linearize for fast web view',
  },
  {
    key: 'stripMetadata',
    id: 'cmp-metadata',
    label: 'Remove metadata (Info and XMP)',
  },
];

const PdfCompressorTool: React.FC<ToolProps> = () => {
  const [file, setFile] = useState<PdfInputFile | null>(null);
  const { preset, advanced, choosePreset, updateAdvanced } =
    useCompressorSettings();
  const { doc, loading, error } = usePdfDocument(file);

  const job = useJob((ctx, source: PdfInputFile, settings: CompressSettings) =>
    compressPdf(source.bytes, settings, browserCompressDeps, ctx),
  );

  const pick = (picked: PdfInputFile) => {
    job.reset();
    setFile(picked);
  };
  const clearFile = () => {
    job.reset();
    setFile(null);
  };
  const onPreset = (id: PresetId) => {
    job.reset();
    choosePreset(id);
  };
  const onAdvanced = (patch: Partial<AdvancedSettings>) => {
    job.reset();
    updateAdvanced(patch);
  };

  const result = job.result;
  const lastStage = result?.report.stages[result.report.stages.length - 1];

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
                  {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'} ·{' '}
                  {formatBytes(file.size)}
                </Text>
              </div>
              <Stack gap="2">
                <Label>Preset</Label>
                <Inline gap="3" align="center" wrap>
                  <Tabs
                    value={preset === 'custom' ? '' : preset}
                    onValueChange={(v) => onPreset(v as PresetId)}
                    variant="soft"
                  >
                    <TabsList aria-label="Preset">
                      {(Object.keys(PRESET_LABELS) as PresetId[]).map((id) => (
                        <TabsTrigger key={id} value={id}>
                          {PRESET_LABELS[id]}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  {preset === 'custom' && <Badge tone="accent">Custom</Badge>}
                </Inline>
                <Text size="sm" tone="muted">
                  {preset === 'custom'
                    ? 'Your own combination of the advanced settings below.'
                    : PRESET_DESCRIPTIONS[preset]}
                </Text>
              </Stack>
              <Accordion type="single">
                <AccordionItem value="advanced">
                  <AccordionTrigger>Advanced settings</AccordionTrigger>
                  <AccordionContent>
                    <Stack gap="4">
                      {SWITCHES.map(({ key, id, label }) => (
                        <Inline key={key} gap="3" align="center">
                          <Switch
                            id={id}
                            checked={advanced[key]}
                            onCheckedChange={(v) => onAdvanced({ [key]: v })}
                            aria-label={label}
                          />
                          <Label htmlFor={id}>{label}</Label>
                        </Inline>
                      ))}
                      <Stack gap="2">
                        <Label htmlFor="cmp-dpi">Target resolution (DPI)</Label>
                        <NumberInput
                          id="cmp-dpi"
                          min={50}
                          max={600}
                          step={10}
                          value={advanced.targetDpi}
                          disabled={!advanced.recompressImages}
                          onValueChange={(v) => onAdvanced({ targetDpi: v })}
                          className="max-w-48"
                        />
                      </Stack>
                      <Stack gap="2">
                        <Label htmlFor="cmp-quality">JPEG quality</Label>
                        <Inline gap="3" align="center">
                          <Slider
                            id="cmp-quality"
                            min={0.3}
                            max={0.95}
                            step={0.05}
                            value={advanced.quality}
                            disabled={!advanced.recompressImages}
                            onValueChange={(v) => onAdvanced({ quality: v })}
                            className="max-w-64"
                          />
                          <Text size="sm" className="font-mono">
                            {Math.round(advanced.quality * 100)}%
                          </Text>
                        </Inline>
                      </Stack>
                    </Stack>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <div>
                <Button
                  variant="solid"
                  leftIcon={<Minimize2 size={16} />}
                  disabled={job.status === 'running'}
                  onClick={() => job.run(file, fromAdvanced(advanced))}
                >
                  Compress PDF
                </Button>
              </div>
            </>
          )}
          <JobPanel job={job} onCancel={job.cancel} runningLabel="Compressing">
            {result && file && (
              <Stack gap="4">
                {result.report.keptOriginal ? (
                  <Alert status="info">
                    <AlertTitle>Already optimised</AlertTitle>
                    <AlertDescription>
                      The compressed version was not smaller (
                      {formatBytes(result.report.inputSize)} →{' '}
                      {formatBytes(lastStage?.after ?? result.report.inputSize)}
                      ), so your original is unchanged. There is nothing to
                      download.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <ResultFiles
                    note={file?.wasEncrypted ? UNENCRYPTED_NOTE : undefined}
                    files={[
                      {
                        name: deriveFilename(file.name, 'compressed', 'pdf'),
                        bytes: result.bytes,
                        detail: formatSizeChange(
                          result.report.inputSize,
                          result.bytes.length,
                        ),
                      },
                    ]}
                    inputSize={file.size}
                  />
                )}
                <CompressReportView report={result.report} />
              </Stack>
            )}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default PdfCompressorTool;
