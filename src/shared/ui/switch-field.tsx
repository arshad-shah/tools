import { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { Switch } from './controls';
import { Label, Text } from './typography';

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
 * The one "switch with a label" row (6-H component audit; four tools had
 * their own): switch first, label beside it, an optional hint below.
 * The label is clickable and names the switch.
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
  const auto = useId();
  const switchId = id ?? auto;
  const hintId = `${switchId}-hint`;
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <Switch
        id={switchId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? hintId : undefined}
      />
      <div className="grid gap-0.5">
        <Label htmlFor={switchId}>{label}</Label>
        {description ? (
          <Text as="span" id={hintId} size="xs" tone="subtle">
            {description}
          </Text>
        ) : null}
      </div>
    </div>
  );
}
SwitchField.displayName = 'SwitchField';
