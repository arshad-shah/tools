import { RadioGroup as CyRadioGroup } from '@arshad-shah/cynosure';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  value: string;
  onValueChange(value: string): void;
  options: RadioOption[];
  /** Names the group; hidden unless `showLabel`. */
  label: string;
  /** Show the label as the group's visible heading. */
  showLabel?: boolean;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * Native radio buttons in a labelled group, Cynosure's RadioGroup: arrow
 * keys move, Space picks. The group is a fieldset named by `label`.
 */
export function RadioGroup({
  value,
  onValueChange,
  options,
  label,
  disabled,
  showLabel,
  orientation = 'horizontal',
  className,
}: RadioGroupProps) {
  return (
    <CyRadioGroup
      label={label}
      labelHidden={!showLabel}
      value={value}
      onChange={onValueChange}
      options={options}
      disabled={disabled}
      orientation={orientation}
      size="sm"
      className={className}
    />
  );
}
RadioGroup.displayName = 'RadioGroup';
