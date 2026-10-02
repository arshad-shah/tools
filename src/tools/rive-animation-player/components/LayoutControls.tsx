import React from 'react';
import { Fit } from '@/shared/ui/adapters/rive-runtime';
import {
  IconArrowDown,
  IconArrowDownLeft,
  IconArrowDownRight,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconArrowUpLeft,
  IconArrowUpRight,
  IconCircle,
} from '@/shared/ui/icons';

import { Grid, IconButton, Label, Select, Stack } from '@/shared/ui';
import { alignValues, fitValues } from '../lib/layout';
import type { AlignFitIndex } from '../types';

const alignmentIcon: Record<string, React.ReactNode> = {
  TopLeft: <IconArrowUpLeft size="sm" />,
  TopCenter: <IconArrowUp size="sm" />,
  TopRight: <IconArrowUpRight size="sm" />,
  CenterLeft: <IconArrowLeft size="sm" />,
  Center: <IconCircle size="sm" />,
  CenterRight: <IconArrowRight size="sm" />,
  BottomLeft: <IconArrowDownLeft size="sm" />,
  BottomCenter: <IconArrowDown size="sm" />,
  BottomRight: <IconArrowDownRight size="sm" />,
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
      <Stack gap="2">
        <Label>Fit</Label>
        <Select
          value={fitValues[alignFitIndex.fit]}
          onValueChange={(v) =>
            setAlignFitIndex({
              ...alignFitIndex,
              fit: fitValues.indexOf(v as keyof typeof Fit),
            })
          }
          items={fitValues.map((f) => ({ value: f, label: f }))}
          aria-label="Fit"
        />
      </Stack>
      <Stack gap="2">
        <Label>Alignment</Label>
        <Grid cols={3} gap="2">
          {alignValues.map((value, idx) => (
            <IconButton
              key={value}
              // A selection, never primary: pressed state on a quiet button.
              variant={alignFitIndex.alignment === idx ? 'secondary' : 'ghost'}
              aria-pressed={alignFitIndex.alignment === idx}
              size="md"
              label={value}
              icon={alignmentIcon[value]}
              onClick={() =>
                setAlignFitIndex({ ...alignFitIndex, alignment: idx })
              }
            />
          ))}
        </Grid>
      </Stack>
    </Stack>
  );
}
