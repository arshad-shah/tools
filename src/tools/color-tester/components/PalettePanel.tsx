import {
  Button,
  Card,
  EmptyState,
  Grid,
  Slider,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { palette as paletteIcon, plus } from '@arshad-shah/cynosure/icons';
import { useMemo } from 'react';
import { formatColor, type Color } from '@/shared/lib/colour';
import { harmonies, scaleEntries, type CvdMode } from '../lib/harmonies';
import type { ColorSettings } from '../settings';
import { PaletteExport } from './PaletteExport';
import { SavedPalettes } from './SavedPalettes';
import { SwatchSet } from './SwatchSet';

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
  const baseHex = formatColor(base, 'hex');
  const entries = useMemo(() => scaleEntries(base, scale), [base, scale]);
  const harm = useMemo(() => harmonies(base), [base]);
  const add = (hex: string) => {
    if (!palette.includes(hex)) onPaletteChange([...palette, hex]);
  };

  return (
    <Stack gap="6">
      <Card as="section" title="Scale and harmonies">
        <Stack gap="6">
          <Stack gap="4">
            <SwatchSet
              label="Tonal scale 50 to 950"
              colors={entries.map((e) => e.color)}
              names={entries.map((e) => `${e.label} ${e.color}`)}
              cvd={cvd}
              onUse={onPickBase}
            />
            <Grid columns={{ base: 1, sm: 2 }} gap="5">
              <Slider
                label={`Hue shift: ${scale.hueShift} degrees`}
                min={-180}
                max={180}
                value={scale.hueShift}
                onChange={(v) =>
                  onScaleChange({ ...scale, hueShift: v as number })
                }
              />
              <Slider
                label={`Chroma curve: ${Math.round(scale.chromaCurve * 100)}%`}
                min={0}
                max={100}
                value={Math.round(scale.chromaCurve * 100)}
                onChange={(v) =>
                  onScaleChange({ ...scale, chromaCurve: (v as number) / 100 })
                }
              />
            </Grid>
          </Stack>
          <Grid columns={{ base: 1, md: 2 }} gap="5">
            {harm.map((h) => (
              <Stack key={h.kind} gap="2">
                <Text size="sm" weight="medium">
                  {h.label}
                </Text>
                <SwatchSet
                  label={h.label}
                  colors={h.colors}
                  cvd={cvd}
                  onUse={onPickBase}
                  size="md"
                />
              </Stack>
            ))}
          </Grid>
        </Stack>
      </Card>

      <Card
        as="section"
        title="Working palette"
        actions={
          <Button
            size="sm"
            variant="soft"
            icon={plus}
            onClick={() => add(baseHex)}
          >
            Add base colour
          </Button>
        }
      >
        <Stack gap="6">
          {palette.length === 0 ? (
            <EmptyState
              size="sm"
              icon={paletteIcon}
              title="No colours yet"
              description="Add the base colour, or colours extracted from an image."
            />
          ) : (
            <SwatchSet
              label="Working palette"
              colors={palette}
              cvd={cvd}
              onUse={onPickBase}
              onRemove={(hex) =>
                onPaletteChange(palette.filter((c) => c !== hex))
              }
            />
          )}
          <PaletteExport scale={entries} palette={palette} />
          <SavedPalettes
            saved={saved}
            onSavedChange={onSavedChange}
            current={palette.length ? palette : entries.map((e) => e.color)}
            onLoad={onPaletteChange}
          />
        </Stack>
      </Card>
    </Stack>
  );
}
