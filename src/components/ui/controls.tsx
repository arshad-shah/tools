import React from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * Switch — controlled toggle (role=switch)
 * ------------------------------------------------------------------ */
interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}
export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled,
  id,
  ...aria
}) => (
  <button
    type="button"
    role="switch"
    id={id}
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
      'disabled:cursor-not-allowed disabled:opacity-50',
      checked ? 'border-accent bg-accent' : 'border-line bg-surface-subtle',
    )}
    {...aria}
  >
    <span
      className={cn(
        'inline-block size-4 rounded-full transition-transform',
        checked ? 'translate-x-6 bg-accent-ink' : 'translate-x-1 bg-fg-muted',
      )}
    />
  </button>
);
Switch.displayName = 'Switch';

/* ------------------------------------------------------------------ *
 * Checkbox — controlled (role=checkbox)
 * ------------------------------------------------------------------ */
interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}
export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onCheckedChange,
  disabled,
  id,
  ...aria
}) => (
  <button
    type="button"
    role="checkbox"
    id={id}
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      'inline-flex size-5 shrink-0 items-center justify-center rounded border transition-colors',
      'disabled:cursor-not-allowed disabled:opacity-50',
      checked
        ? 'border-accent bg-accent text-accent-ink'
        : 'border-line-strong bg-surface',
    )}
    {...aria}
  >
    {checked && <Check size={14} strokeWidth={3} />}
  </button>
);
Checkbox.displayName = 'Checkbox';

/* ------------------------------------------------------------------ *
 * Slider — range input
 * ------------------------------------------------------------------ */
interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}
export const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  id,
  className,
  ...aria
}) => (
  <input
    type="range"
    id={id}
    min={min}
    max={max}
    step={step}
    value={value}
    disabled={disabled}
    onChange={(e) => onValueChange(Number(e.target.value))}
    className={cn(
      'h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-strong accent-accent',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...aria}
  />
);
Slider.displayName = 'Slider';

/* ------------------------------------------------------------------ *
 * NumberInput — number field with steppers
 * ------------------------------------------------------------------ */
interface NumberInputProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}
export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  disabled,
  id,
  className,
  ...aria
}) => {
  const clamp = (n: number) =>
    Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  return (
    <div
      className={cn(
        'flex h-10 items-center rounded-md border border-line bg-surface focus-within:border-accent',
        disabled && 'opacity-50',
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrement"
        disabled={disabled}
        onClick={() => onValueChange(clamp(value - step))}
        className="flex h-full w-9 items-center justify-center text-fg-subtle hover:text-fg disabled:cursor-not-allowed"
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        id={id}
        value={Number.isNaN(value) ? '' : value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onValueChange(clamp(Number(e.target.value)))}
        className="min-w-0 flex-1 bg-transparent text-center font-mono text-sm text-fg focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        {...aria}
      />
      <button
        type="button"
        aria-label="Increment"
        disabled={disabled}
        onClick={() => onValueChange(clamp(value + step))}
        className="flex h-full w-9 items-center justify-center text-fg-subtle hover:text-fg disabled:cursor-not-allowed"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};
NumberInput.displayName = 'NumberInput';

/* ------------------------------------------------------------------ *
 * Progress — determinate bar
 * ------------------------------------------------------------------ */
interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
}
export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  className,
}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-surface-strong',
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};
Progress.displayName = 'Progress';
