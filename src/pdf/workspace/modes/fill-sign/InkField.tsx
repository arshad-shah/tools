import { ColorField } from '@/shared/ui';
import { formatColor } from '@/shared/lib/colour';
import { INK_COLORS } from '@/pdf/sign';

const PRESETS = INK_COLORS.map((c) => c.value);

/** Ink colour (ruling R30 ColorField): opaque #rrggbb, presets as the palette. */
export function InkField({
  value,
  onChange,
  disabled,
  label = 'Ink colour',
}: {
  value: string;
  onChange(hex: string): void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <ColorField
      label={label}
      value={value}
      palette={PRESETS}
      defaultFormat="hex"
      disabled={disabled}
      onChange={(_, color) =>
        onChange(formatColor({ ...color, alpha: 1 }, 'hex'))
      }
    />
  );
}
