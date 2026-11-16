import {
  Card,
  ColorField,
  Grid,
  NumberField,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import {
  isLossy,
  needsBackground,
  type ImageEncoding,
} from '@/shared/lib/image/pipeline';
import { ENCODING_LABELS } from '../lib/labels';
import type { ImageSettings, ResizeMode } from '../settings';

const ENCODINGS = Object.keys(ENCODING_LABELS) as ImageEncoding[];

const RESIZE_OPTIONS: { value: ResizeMode; label: string }[] = [
  { value: 'none', label: 'Original size' },
  { value: 'max', label: 'Max size' },
  { value: 'percent', label: 'Percent' },
];

export interface PresetPanelProps {
  settings: ImageSettings;
  update(patch: Partial<ImageSettings>): void;
}

const num = (v: number | null, fallback: number) =>
  v === null || !Number.isFinite(v) ? fallback : v;

/** The one preset every file in the batch is compressed with. */
export function PresetPanel({ settings, update }: PresetPanelProps) {
  const { encoding, resize } = settings;
  const setResize = (patch: Partial<ImageSettings['resize']>) =>
    update({ resize: { ...resize, ...patch } });

  return (
    <Card as="section" title="Preset" headingLevel={2}>
      <Stack gap="5">
        <Select
          label="Format"
          value={encoding}
          onChange={(v) => update({ encoding: v as ImageEncoding })}
          options={ENCODINGS.map((e) => ({
            value: e,
            label: ENCODING_LABELS[e],
          }))}
        />
        {isLossy(encoding) ? (
          <Slider
            label="Quality"
            value={Math.round(settings.quality * 100)}
            min={1}
            max={100}
            showValue
            onChange={(v) =>
              typeof v === 'number' && update({ quality: v / 100 })
            }
          />
        ) : (
          <Text size="sm" tone="muted">
            {encoding === 'png'
              ? 'PNG is lossless: there is no quality setting, and the file can end up larger than the original.'
              : 'Reduces the image to at most 256 colours, which often makes graphics much smaller.'}
          </Text>
        )}
        {needsBackground(encoding) ? (
          <ColorField
            label="Background colour"
            description="JPEG has no transparency: transparent areas get this colour."
            format="hex"
            value={settings.background}
            onChange={(v) => update({ background: v.slice(0, 7) })}
          />
        ) : null}
        <Stack gap="3">
          <SegmentedControl
            label="Resize"
            size="sm"
            value={resize.mode}
            onChange={(mode) => setResize({ mode: mode as ResizeMode })}
            options={RESIZE_OPTIONS}
          />
          {resize.mode === 'max' ? (
            <Grid columns={2} gap="4">
              <NumberField
                label="Max width (px)"
                value={resize.maxWidth}
                min={0}
                step={10}
                onChange={(v) => setResize({ maxWidth: num(v, 0) })}
              />
              <NumberField
                label="Max height (px)"
                value={resize.maxHeight}
                min={0}
                step={10}
                onChange={(v) => setResize({ maxHeight: num(v, 0) })}
              />
            </Grid>
          ) : null}
          {resize.mode === 'percent' ? (
            <NumberField
              label="Scale (percent)"
              value={resize.percent}
              min={1}
              max={100}
              onChange={(v) => setResize({ percent: num(v, 100) })}
            />
          ) : null}
          <Text size="xs" tone="muted">
            Keeps the aspect ratio and never enlarges. 0 leaves a side
            unlimited.
          </Text>
        </Stack>
        <NumberField
          label="Target size (KB)"
          description="0 is off. Lowers the quality until each file fits (JPEG, WebP and AVIF)."
          value={settings.targetKB}
          min={0}
          step={10}
          onChange={(v) => update({ targetKB: num(v, 0) })}
        />
      </Stack>
    </Card>
  );
}
