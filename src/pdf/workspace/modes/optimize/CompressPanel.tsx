import {
  Badge,
  Button,
  Disclosure,
  Inline,
  List,
  NumberField,
  Notice,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure';
import { fileCompress } from '@arshad-shah/cynosure/icons';
import { formatBytes } from '@/shared/lib/format';
import { CompressReportView } from '@/pdf/ui/CompressReport';
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

function AdvancedSettings({
  settings,
  update,
}: {
  settings: CompressSettings;
  update(patch: Partial<CompressSettings>): void;
}) {
  const images = settings.images ?? DEFAULT_IMAGES;
  const setImages = (patch: Partial<typeof images>) =>
    update({ images: { ...images, ...patch } });
  return (
    <Stack gap="4">
      <Switch
        label="Recompress images"
        size="sm"
        checked={settings.images !== null}
        onChange={(on) => update({ images: on ? images : null })}
      />
      <NumberField
        label="Target resolution (DPI)"
        size="sm"
        min={50}
        max={600}
        step={10}
        value={images.targetDpi}
        disabled={settings.images === null}
        onChange={(targetDpi) => targetDpi !== null && setImages({ targetDpi })}
      />
      <Slider
        label="JPEG quality"
        size="sm"
        min={0.3}
        max={0.95}
        step={0.05}
        showValue
        labels={{ value: (v: number) => `${Math.round(v * 100)}%` }}
        value={images.quality}
        disabled={settings.images === null}
        onChange={(quality) =>
          typeof quality === 'number' && setImages({ quality })
        }
      />
      {QPDF_SWITCHES.map(({ key, label }) => (
        <Switch
          key={key}
          label={label}
          size="sm"
          checked={settings.qpdf[key]}
          onChange={(v) => update({ qpdf: { ...settings.qpdf, [key]: v } })}
        />
      ))}
      <Switch
        label="Remove metadata (Info and XMP)"
        size="sm"
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
      <Notice
        tone={details?.keptOriginal ? 'info' : 'success'}
        size="sm"
        title={report.title}
      >
        {details?.keptOriginal
          ? `The file stays at ${formatBytes(details.inputSize)}. This is not an error: there was nothing to gain.`
          : null}
      </Notice>
      {details ? (
        <CompressReportView report={details} />
      ) : (
        <>
          <List
            label="Repair result"
            size="sm"
            items={report.lines.map((l) => ({ id: l, label: l }))}
          />
          {report.warnings.length > 0 ? (
            <Disclosure
              summary={`Problems fixed (${report.warnings.length})`}
              variant="line"
              size="sm"
            >
              <List
                size="sm"
                items={report.warnings.map((w, i) => ({
                  id: String(i),
                  label: w,
                }))}
              />
            </Disclosure>
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
            fullWidth
            value={preset}
            onChange={(v) => choosePreset(v as PresetId)}
            options={(Object.keys(PRESET_LABELS) as PresetId[]).map((id) => ({
              value: id,
              label: PRESET_LABELS[id],
            }))}
          />
          {custom ? (
            <Badge tone="accent" size="sm">
              Custom
            </Badge>
          ) : null}
        </Inline>
        <Text size="sm" tone="muted">
          {custom
            ? 'Your own combination of the advanced settings below.'
            : PRESET_DESCRIPTIONS[preset]}
        </Text>
      </Stack>
      <Disclosure summary="Advanced settings" variant="line" size="sm">
        <AdvancedSettings settings={settings} update={update} />
      </Disclosure>
      <Button
        variant="solid"
        tone="accent"
        fullWidth
        icon={fileCompress}
        onClick={() => void compress(doc)}
      >
        Compress
      </Button>
      {result ? <OptimizeResult {...result} /> : null}
    </Stack>
  );
}
