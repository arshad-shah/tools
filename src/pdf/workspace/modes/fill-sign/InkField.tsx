import { InkPicker } from '../../ui/InkPicker';
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
    <InkPicker
      label={label}
      value={value}
      swatches={OPTIONS}
      disabled={disabled}
      onChange={onChange}
    />
  );
}
