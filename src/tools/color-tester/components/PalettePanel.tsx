import { useMemo } from 'react';
import { formatColor, parseColor, type Color } from '@/shared/lib/colour';
import { useClipboard } from '@/shared/lib/clipboard';
import { IconCheck, IconCopy, IconPlus, IconX } from '@/shared/ui/icons';
import {
  Button,
  ColorRamp,
  Heading,
  IconButton,
  Inline,
  Label,
  Slider,
  Stack,
  Swatch,
  Text,
} from '@/shared/ui';
import {
  harmonies,
  scaleEntries,
  viewAs,
  type CvdMode,
} from '../lib/harmonies';
import type { ColorSettings } from '../settings';
import { PaletteExport } from './PaletteExport';
import { SavedPalettes } from './SavedPalettes';

type Scale = ColorSettings['scale'];

export interface PalettePanelProps {
  base: Color;
  /** The working palette (hex colours). */
  palette: string[];
  onPaletteChange(next: string[]): void;
  scale: Scale;
  onScaleChange(next: Scale): void;
  onPickBase(css: string): void;
  cvd: CvdMode;
  saved: ColorSettings['palettes'];
  onSavedChange(next: ColorSettings['palettes']): void;
}

function CopySwatch({
  hex,
  label,
  cvd,
  copied,
  onCopy,
}: {
  hex: string;
  label: string;
  cvd: CvdMode;
  copied: boolean;
  onCopy(): void;
}) {
  const shown = viewAs(parseColor(hex), cvd);
  return (
    <Inline gap="1" align="center" wrap={false}>
      <Swatch color={shown} label={`${label} ${hex}`} size="lg" />
      <Text as="span" size="xs" mono>
        {hex}
      </Text>
      <IconButton
        label={`Copy ${hex}`}
        icon={copied ? IconCheck : IconCopy}
        size="sm"
        variant="ghost"
        onClick={onCopy}
      />
    </Inline>
  );
}

/** OKLCH scale, harmonies, the working palette, export and saved palettes. */
export function PalettePanel({
  base,
  palette,
  onPaletteChange,
  scale,
  onScaleChange,
  onPickBase,
  cvd,
  saved,
  onSavedChange,
}: PalettePanelProps) {
  const { copiedKey, copy } = useClipboard();
  const baseHex = formatColor(base, 'hex');
  const entries = useMemo(() => scaleEntries(base, scale), [base, scale]);
  const harm = useMemo(() => harmonies(base), [base]);
  const add = (hex: string) => {
    if (!palette.includes(hex)) onPaletteChange([...palette, hex]);
  };

  return (
    <Stack gap="5">
      <Stack gap="3">
        <Heading level={3} size="md">
          OKLCH scale
        </Heading>
        {cvd === 'none' ? (
          <ColorRamp
            base={baseHex}
            label="Tonal scale 50 to 950"
            hueShift={scale.hueShift}
            chromaCurve={scale.chromaCurve}
            onSelect={(css) => onPickBase(css)}
            size="lg"
          />
        ) : (
          <Inline gap="1" role="group" aria-label="Tonal scale 50 to 950">
            {entries.map((e) => (
              <Swatch
                key={e.label}
                color={viewAs(parseColor(e.color), cvd)}
                label={`${e.label} ${e.color} as seen with ${cvd}`}
                size="lg"
              />
            ))}
          </Inline>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Stack gap="1">
            <Label htmlFor="color-hue-shift">{`Hue shift: ${scale.hueShift} degrees`}</Label>
            <Slider
              id="color-hue-shift"
              min={-180}
              max={180}
              value={scale.hueShift}
              onValueChange={(v) => onScaleChange({ ...scale, hueShift: v })}
            />
          </Stack>
          <Stack gap="1">
            <Label htmlFor="color-chroma-curve">{`Chroma curve: ${Math.round(scale.chromaCurve * 100)}%`}</Label>
            <Slider
              id="color-chroma-curve"
              min={0}
              max={100}
              value={Math.round(scale.chromaCurve * 100)}
              onValueChange={(v) =>
                onScaleChange({ ...scale, chromaCurve: v / 100 })
              }
            />
          </Stack>
        </div>
      </Stack>

      <Stack gap="3">
        <Heading level={3} size="md">
          Harmonies
        </Heading>
        {harm.map((h) => (
          <Stack key={h.kind} gap="1">
            <Text size="sm" tone="muted">
              {h.label}
            </Text>
            <Inline gap="3">
              {h.colors.map((hex, i) => (
                <CopySwatch
                  key={`${h.kind}-${i}`}
                  hex={hex}
                  label={h.label}
                  cvd={cvd}
                  copied={copiedKey === `${h.kind}-${i}`}
                  onCopy={() => void copy(hex, `${h.kind}-${i}`)}
                />
              ))}
            </Inline>
          </Stack>
        ))}
      </Stack>

      <Stack gap="3">
        <Inline gap="2" justify="between" align="center">
          <Heading level={3} size="md">
            Working palette
          </Heading>
          <Button
            size="sm"
            leftIcon={<IconPlus size="sm" />}
            onClick={() => add(baseHex)}
          >
            Add base colour
          </Button>
        </Inline>
        {palette.length === 0 ? (
          <Text size="sm" tone="muted">
            Empty. Add the base colour or colours extracted from an image.
          </Text>
        ) : (
          <Inline gap="3" role="list" aria-label="Working palette">
            {palette.map((hex) => (
              <Inline key={hex} gap="1" align="center" role="listitem">
                <Swatch
                  color={viewAs(parseColor(hex), cvd)}
                  label={hex}
                  size="lg"
                />
                <Text as="span" size="xs" mono>
                  {hex}
                </Text>
                <IconButton
                  label={`Remove ${hex}`}
                  icon={IconX}
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    onPaletteChange(palette.filter((c) => c !== hex))
                  }
                />
              </Inline>
            ))}
          </Inline>
        )}
      </Stack>

      <PaletteExport scale={entries} palette={palette} />
      <SavedPalettes
        saved={saved}
        onSavedChange={onSavedChange}
        current={palette.length ? palette : entries.map((e) => e.color)}
        onLoad={onPaletteChange}
      />
    </Stack>
  );
}
