import {
  Button,
  ColorSwatches,
  CopyButton,
  IconButton,
  Inline,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { close, pipette } from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import { parseColor } from '@/shared/lib/colour';
import { viewAs, type CvdMode } from '../lib/harmonies';

export interface SwatchSetProps {
  /** Names the group of swatches. */
  label: string;
  /** Hex colours, as they really are. */
  colors: string[];
  /** Spoken name of each swatch (default its hex). */
  names?: string[];
  cvd: CvdMode;
  /** Makes the chosen colour the base colour. */
  onUse?(hex: string): void;
  /** Removes the chosen colour (the working palette). */
  onRemove?(hex: string): void;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * A row of swatches (shown as seen with `cvd`). Choosing one shows its hex
 * with Copy, and Use as base or Remove where the set offers them.
 */
export function SwatchSet({
  label,
  colors,
  names,
  cvd,
  onUse,
  onRemove,
  size = 'lg',
}: SwatchSetProps) {
  const [chosen, setChosen] = useState<number | null>(null);
  const shown = colors.map((hex) => viewAs(parseColor(hex), cvd));
  const at = chosen !== null && chosen < colors.length ? chosen : null;
  const hex = at !== null ? colors[at] : null;
  return (
    <Stack gap="2">
      <ColorSwatches
        label={label}
        size={size}
        swatches={shown.map((value, i) => ({
          value,
          label:
            (names?.[i] ?? colors[i]) +
            (cvd === 'none' ? '' : `, as seen with ${cvd}`),
        }))}
        value={at !== null ? shown[at] : undefined}
        onChange={(v) => {
          const i = shown.indexOf(v);
          setChosen(i >= 0 ? i : null);
        }}
      />
      {hex ? (
        <Inline gap="2" align="center" wrap>
          <Text variant="code">{hex}</Text>
          <CopyButton
            size="sm"
            variant="ghost"
            value={hex}
            labels={{ copy: `Copy ${hex}` }}
          />
          {onUse ? (
            <Button
              size="sm"
              variant="ghost"
              icon={pipette}
              onClick={() => onUse(hex)}
            >
              Use as base
            </Button>
          ) : null}
          {onRemove ? (
            <IconButton
              size="sm"
              variant="ghost"
              tone="neutral"
              icon={close}
              label={`Remove ${hex}`}
              onClick={() => {
                setChosen(null);
                onRemove(hex);
              }}
            />
          ) : null}
        </Inline>
      ) : null}
    </Stack>
  );
}
