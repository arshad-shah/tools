import { useId } from 'react';
import { ColorInput, Label, Stack } from '@/shared/ui';

/** A labelled colour field (visible label, hex input and picker). */
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange(hex: string): void;
}) {
  const id = useId();
  return (
    <Stack gap="1">
      <Label htmlFor={id}>{label}</Label>
      <ColorInput id={id} label={label} value={value} onChange={onChange} />
    </Stack>
  );
}
