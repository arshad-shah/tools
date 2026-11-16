import { ColorField, ColorSwatches, Stack } from '@arshad-shah/cynosure';

export interface InkPickerProps {
  label: string;
  value: string;
  onChange(color: string): void;
  /** The quick choices, each with a spoken name. */
  swatches: readonly { value: string; label: string }[];
  /** Offers any colour too (a ColorField under the swatches). */
  custom?: boolean;
  disabled?: boolean;
}

/** A colour for ink, marks or text: named swatches, and any colour. */
export function InkPicker({
  label,
  value,
  onChange,
  swatches,
  custom = true,
  disabled,
}: InkPickerProps) {
  const known = swatches.some(
    (s) => s.value.toLowerCase() === value.toLowerCase(),
  );
  return (
    <Stack gap="3">
      <ColorSwatches
        label={label}
        swatches={[...swatches]}
        value={known ? value : undefined}
        onChange={onChange}
        disabled={disabled}
      />
      {custom ? (
        <ColorField
          label={`${label}: any colour`}
          size="sm"
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      ) : null}
    </Stack>
  );
}
