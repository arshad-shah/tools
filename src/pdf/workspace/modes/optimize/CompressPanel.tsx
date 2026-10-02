import { useId } from 'react';
import { formatBytes } from '@/shared/lib/format';
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
  Inline,
  Label,
  List,
  ListItem,
  NumberInput,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Text,
} from '@/shared/ui';
import { IconMinimize2 } from '@/shared/ui/icons';
import { CompressReportView } from '@/pdf/components/CompressReport';
import type {
  CompressReport,
  CompressSettings,
  PresetId,
  QpdfSettings,
} from '@/pdf/compress/pipeline';
import { isPresetSettings, PRESET_LABELS } from '@/pdf/doc/ops/optimize';
import type { CheckpointReport } from '@/pdf/doc/types';
import type { ModeProps } from '../types';
import { compress, currentOptimizeResult } from './actions';
import {
  DEFAULT_IMAGES,
  PRESET_DESCRIPTIONS,
  useOptimizeSettings,
} from './settings-store';

type QpdfKey = Exclude<keyof QpdfSettings, 'linearize'>;
const QPDF_SWITCHES: { key: QpdfKey; label: string }[] = [
  { key: 'objectStreams', label: 'Generate object streams' },
  { key: 'recompressFlate', label: 'Recompress Flate streams' },
  { key: 'removeUnreferenced', label: 'Remove unreferenced objects' },
];

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange(v: boolean): void;
}) {
  const id = useId();
  return (
    <Inline gap="3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </Inline>
  );
}

function AdvancedSettings({
  settings,
  update,
}: {
  settings: CompressSettings;
  update(patch: Partial<CompressSettings>): void;
}) {
  const dpiId = useId();
  const qualityId = useId();
  const images = settings.images ?? DEFAULT_IMAGES;
  const setImages = (patch: Partial<typeof images>) =>
    update({ images: { ...images, ...patch } });
  return (
    <Stack gap="4">
      <SwitchRow
        label="Recompress images"
        checked={settings.images !== null}
        onChange={(on) => update({ images: on ? images : null })}
      />
      <Stack gap="2">
        <Label htmlFor={dpiId}>Target resolution (DPI)</Label>
        <NumberInput
          id={dpiId}
          min={50}
          max={600}
          step={10}
          value={images.targetDpi}
          disabled={settings.images === null}
          onValueChange={(targetDpi) => setImages({ targetDpi })}
        />
      </Stack>
      <Stack gap="2">
        <Label htmlFor={qualityId}>JPEG quality</Label>
        <Inline gap="3">
          <Slider
            id={qualityId}
            min={0.3}
            max={0.95}
            step={0.05}
            value={images.quality}
            disabled={settings.images === null}
            onValueChange={(quality) => setImages({ quality })}
          />
          <Text size="sm" className="font-mono">
            {Math.round(images.quality * 100)}%
          </Text>
        </Inline>
      </Stack>
      {QPDF_SWITCHES.map(({ key, label }) => (
        <SwitchRow
          key={key}
          label={label}
          checked={settings.qpdf[key]}
          onChange={(v) => update({ qpdf: { ...settings.qpdf, [key]: v } })}
        />
      ))}
      <SwitchRow
        label="Remove metadata (Info and XMP)"
        checked={settings.stripMetadata}
        onChange={(stripMetadata) => update({ stripMetadata })}
      />
    </Stack>
  );
}

/** The last Compress or Repair result, as the document stands now. */
export function OptimizeResult({
  type,
  report,
}: {
  type: 'optimize.compress' | 'optimize.repair';
  report: CheckpointReport;
}) {
  const details =
    type === 'optimize.compress' ? (report.details as CompressReport) : null;
  return (
    <Stack gap="3">
      <Alert status={details?.keptOriginal ? 'info' : 'success'}>
        <AlertTitle>{report.title}</AlertTitle>
        {details?.keptOriginal ? (
          <AlertDescription>
            The file stays at {formatBytes(details.inputSize)}. This is not an
            error: there was nothing to gain.
          </AlertDescription>
        ) : null}
      </Alert>
      {details ? (
        <CompressReportView report={details} />
      ) : (
        <>
          <List aria-label="Repair result">
            {report.lines.map((l) => (
              <ListItem key={l}>{l}</ListItem>
            ))}
          </List>
          {report.warnings.length > 0 ? (
            <Accordion type="single">
              <AccordionItem value="warnings">
                <AccordionTrigger>
                  Problems fixed ({report.warnings.length})
                </AccordionTrigger>
                <AccordionContent>
                  <List>
                    {report.warnings.map((w, i) => (
                      <ListItem key={i}>{w}</ListItem>
                    ))}
                  </List>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}
        </>
      )}
    </Stack>
  );
}

/** Presets, advanced settings, "Compress" and the shared compress report. */
export function CompressPanel({ doc }: Pick<ModeProps, 'doc'>) {
  const { preset, settings, choosePreset, update } = useOptimizeSettings();
  const custom = !isPresetSettings({ preset, settings });
  const result = currentOptimizeResult(doc.state, doc.view);
  return (
    <Stack gap="4">
      <Stack gap="2">
        <Inline gap="2" wrap>
          <SegmentedControl
            label="Compression preset"
            size="sm"
            value={preset}
            onChange={choosePreset}
            options={(Object.keys(PRESET_LABELS) as PresetId[]).map((id) => ({
              value: id,
              label: PRESET_LABELS[id],
            }))}
          />
          {custom ? <Badge tone="accent">Custom</Badge> : null}
        </Inline>
        <Text size="sm" tone="muted">
          {custom
            ? 'Your own combination of the advanced settings below.'
            : PRESET_DESCRIPTIONS[preset]}
        </Text>
      </Stack>
      <Accordion type="single">
        <AccordionItem value="advanced">
          <AccordionTrigger>Advanced settings</AccordionTrigger>
          <AccordionContent>
            <AdvancedSettings settings={settings} update={update} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Button
        variant="primary"
        leftIcon={<IconMinimize2 size="sm" />}
        onClick={() => void compress(doc)}
      >
        Compress
      </Button>
      {result ? <OptimizeResult {...result} /> : null}
    </Stack>
  );
}
