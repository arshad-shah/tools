import { Switch } from '@arshad-shah/cynosure';

export interface SwitchFieldProps {
  label: string;
  checked: boolean;
  onCheckedChange(checked: boolean): void;
  /** A short hint under the label; it also describes the switch. */
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * The one "switch with a label" row (6-H component audit), Cynosure's
 * Switch: switch first, label beside it, an optional hint below. The whole
 * row is clickable and the label names the switch.
 */
export function SwitchField({
  label,
  checked,
  onCheckedChange,
  description,
  disabled,
  id,
  className,
}: SwitchFieldProps) {
  return (
    <Switch
      id={id}
      label={label}
      description={description}
      checked={checked}
      onChange={(checked: boolean) => onCheckedChange(checked)}
      disabled={disabled}
      className={className}
    />
  );
}
SwitchField.displayName = 'SwitchField';
