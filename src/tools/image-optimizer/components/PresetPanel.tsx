import React from 'react';
import { formatColor, gamutMap } from '@/shared/lib/colour';
import {
  isLossy,
  needsBackground,
  type ImageEncoding,
} from '@/shared/lib/image/pipeline';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ColorField,
  Grid,
  Label,
  NumberInput,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Text,
} from '@/shared/ui';
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

/** The one preset every file in the batch is compressed with. */
export const PresetPanel: React.FC<PresetPanelProps> = ({
  settings,
  update,
}) => {
  const { encoding, resize } = settings;
  const quality = Math.round(settings.quality * 100);
  const setResize = (patch: Partial<ImageSettings['resize']>) =>
    update({ resize: { ...resize, ...patch } });

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Preset</CardTitle>
      </CardHeader>
      <CardBody>
        <Stack gap="5">
          <Stack gap="2">
            <Label htmlFor="image-format">Format</Label>
            <Select
              id="image-format"
              value={encoding}
              onValueChange={(v) => update({ encoding: v as ImageEncoding })}
              items={ENCODINGS.map((e) => ({
                value: e,
                label: ENCODING_LABELS[e],
              }))}
            />
          </Stack>

          {isLossy(encoding) ? (
            <Stack gap="2">
              <Label htmlFor="image-quality">Quality: {quality}</Label>
              <Slider
                id="image-quality"
                value={quality}
                min={1}
                max={100}
                onValueChange={(v) => update({ quality: v / 100 })}
              />
            </Stack>
          ) : (
            <Text size="sm" tone="subtle">
              {encoding === 'png'
                ? 'PNG is lossless: there is no quality setting, and the file can end up larger than the original.'
                : 'Reduces the image to at most 256 colours, which often makes graphics much smaller.'}
            </Text>
          )}

          {needsBackground(encoding) && (
            <Stack gap="1">
              <ColorField
                label="Background colour"
                value={settings.background}
                alpha={false}
                onChange={(_css, color) =>
                  update({
                    background: formatColor(
                      gamutMap({ ...color, alpha: 1 }),
                      'hex',
                    ).slice(0, 7),
                  })
                }
              />
              <Text size="xs" tone="subtle">
                JPEG has no transparency: transparent areas get this colour.
              </Text>
            </Stack>
          )}

          <Stack gap="2">
            <SegmentedControl
              label="Resize"
              size="sm"
              value={resize.mode}
              onChange={(mode) => setResize({ mode })}
              options={RESIZE_OPTIONS}
            />
            {resize.mode === 'max' && (
              <Grid max={2} gap="3">
                <Stack gap="1">
                  <Label htmlFor="image-max-width">Max width (px)</Label>
                  <NumberInput
                    id="image-max-width"
                    value={resize.maxWidth}
                    min={0}
                    step={10}
                    onValueChange={(maxWidth) => setResize({ maxWidth })}
                  />
                </Stack>
                <Stack gap="1">
                  <Label htmlFor="image-max-height">Max height (px)</Label>
                  <NumberInput
                    id="image-max-height"
                    value={resize.maxHeight}
                    min={0}
                    step={10}
                    onValueChange={(maxHeight) => setResize({ maxHeight })}
                  />
                </Stack>
              </Grid>
            )}
            {resize.mode === 'percent' && (
              <Stack gap="1">
                <Label htmlFor="image-percent">Scale (percent)</Label>
                <NumberInput
                  id="image-percent"
                  value={resize.percent}
                  min={1}
                  max={100}
                  onValueChange={(percent) => setResize({ percent })}
                />
              </Stack>
            )}
            <Text size="xs" tone="subtle">
              Keeps the aspect ratio and never enlarges. 0 leaves a side
              unlimited.
            </Text>
          </Stack>

          <Stack gap="1">
            <Label htmlFor="image-target">Target size (KB)</Label>
            <NumberInput
              id="image-target"
              value={settings.targetKB}
              min={0}
              step={10}
              onValueChange={(targetKB) => update({ targetKB })}
            />
            <Text size="xs" tone="subtle">
              0 is off. Lowers the quality until each file fits (JPEG, WebP and
              AVIF).
            </Text>
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
};
