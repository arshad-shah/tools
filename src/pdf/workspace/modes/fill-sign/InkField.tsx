import { ColorSwatchPicker } from '@/shared/ui';
import { INK_COLORS } from '@/pdf/sign';

const OPTIONS = INK_COLORS.map((c) => ({ value: c.value, label: c.label }));

/**
 * Ink colour: Black, Blue and Dark blue as swatches (plan H-2), plus a
 * custom opaque #rrggbb colour.
 */
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
    <ColorSwatchPicker
      label={label}
      showLabel
      value={value}
      options={OPTIONS}
      allowCustom
      disabled={disabled}
      onChange={onChange}
    />
  );
}
