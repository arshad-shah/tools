import { Input } from './input';

export interface DateInputProps {
  label: string;
  /** ISO value for the kind: YYYY-MM-DD or YYYY-MM-DDTHH:mm. */
  value: string;
  onChange(iso: string): void;
  kind?: 'date' | 'datetime-local';
  min?: string;
  max?: string;
  disabled?: boolean;
  id?: string;
}

/** Native date (or date and time) field in the kit's input style. */
export function DateInput({
  label,
  value,
  onChange,
  kind = 'date',
  min,
  max,
  disabled,
  id,
}: DateInputProps) {
  return (
    <Input
      id={id}
      type={kind}
      aria-label={label}
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      onChange={onChange}
    />
  );
}
DateInput.displayName = 'DateInput';
