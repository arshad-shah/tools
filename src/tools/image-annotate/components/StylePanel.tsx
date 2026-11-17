import { ColorField, Slider, Stack } from '@arshad-shah/cynosure';
import { SWATCHES } from '../settings';

export interface StylePanelProps {
  color: string;
  width: number;
  onColor(color: string): void;
  /** Every change while dragging the slider. */
  onWidth(width: number): void;
  /** The slider settled: one undo step for a selected object. */
  onWidthCommit?(width: number): void;
  disabled?: boolean;
}

/** Colour and stroke width for new objects (and the selected one). */
export function StylePanel({
  color,
  width,
  onColor,
  onWidth,
  onWidthCommit,
  disabled,
}: StylePanelProps) {
  return (
    <Stack gap="4">
      <ColorField
        label="Colour"
        value={color}
        format="hex"
        swatches={SWATCHES}
        disabled={disabled}
        onChange={onColor}
      />
      <Slider
        label="Stroke width"
        min={1}
        max={40}
        step={1}
        showValue
        disabled={disabled}
        value={width}
        onChange={(v) => onWidth(Array.isArray(v) ? v[0] : (v as number))}
        onCommit={(v) =>
          onWidthCommit?.(Array.isArray(v) ? v[0] : (v as number))
        }
        labels={{ value: (v) => `${v} px` }}
      />
    </Stack>
  );
}
