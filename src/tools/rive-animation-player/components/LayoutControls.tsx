import { Grid, IconButton, Select, Stack, Text } from '@arshad-shah/cynosure';
import {
  arrowDown,
  arrowDownLeft,
  arrowDownRight,
  arrowLeft,
  arrowRight,
  arrowUp,
  arrowUpLeft,
  arrowUpRight,
  circleDot,
  type IconData,
} from '@arshad-shah/cynosure/icons';
import { Fit } from '@/shared/lib/rive-runtime';
import { alignValues, fitValues } from '../lib/layout';
import type { AlignFitIndex } from '../types';

const alignmentIcon: Record<string, IconData> = {
  TopLeft: arrowUpLeft,
  TopCenter: arrowUp,
  TopRight: arrowUpRight,
  CenterLeft: arrowLeft,
  Center: circleDot,
  CenterRight: arrowRight,
  BottomLeft: arrowDownLeft,
  BottomCenter: arrowDown,
  BottomRight: arrowDownRight,
};

/** Fit picker and the 3x3 alignment grid. */
export function LayoutControls({
  alignFitIndex,
  setAlignFitIndex,
}: {
  alignFitIndex: AlignFitIndex;
  setAlignFitIndex: (idx: AlignFitIndex) => void;
}) {
  return (
    <Stack gap="4">
      <Select
        label="Fit"
        value={fitValues[alignFitIndex.fit]}
        onChange={(v) =>
          setAlignFitIndex({
            ...alignFitIndex,
            fit: fitValues.indexOf(v as keyof typeof Fit),
          })
        }
        options={fitValues.map((f) => ({ value: f, label: f }))}
      />
      <Stack gap="2">
        <Text size="sm" weight="medium">
          Alignment
        </Text>
        <Grid
          columns="repeat(3, max-content)"
          gap="1"
          role="group"
          aria-label="Alignment"
        >
          {alignValues.map((value, idx) => {
            const on = alignFitIndex.alignment === idx;
            return (
              <IconButton
                key={value}
                // A selection, never primary: pressed state on a quiet button.
                variant={on ? 'soft' : 'ghost'}
                tone={on ? 'accent' : 'neutral'}
                aria-pressed={on}
                label={value}
                icon={alignmentIcon[value]}
                onClick={() =>
                  setAlignFitIndex({ ...alignFitIndex, alignment: idx })
                }
              />
            );
          })}
        </Grid>
      </Stack>
    </Stack>
  );
}
