import { ColorField as CyColorField } from '@arshad-shah/cynosure';

/** A labelled colour (hex) with Cynosure's picker. */
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange(hex: string): void;
}) {
  return (
    <CyColorField label={label} value={value} onChange={onChange} size="sm" />
  );
}
