import React, { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { IconMinus, IconPlus, type IconComponent } from './icons';
import { IconButton } from './button';
import { Tooltip } from './tooltip';

export interface StepperProps {
  value: number;
  onValueChange(value: number): void;
  min: number;
  max: number;
  step?: number;
  /** Accessible name of the value field, e.g. "Text size in points". */
  label: string;
  /** e.g. "Smaller text". Default "Decrease". */
  decrementLabel?: string;
  /** e.g. "Larger text". Default "Increase". */
  incrementLabel?: string;
  decrementIcon?: IconComponent;
  incrementIcon?: IconComponent;
  /** Shown after the value, e.g. "pt" (decorative; put units in `label`). */
  unit?: string;
  /** lg: 44px buttons for touch. Default md. */
  size?: 'md' | 'lg';
  /** Tooltips on the buttons (off inside a dense touch bar). Default true. */
  tooltips?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

const decimals = (step: number) => {
  const s = String(step);
  return s.includes('.') ? s.length - s.indexOf('.') - 1 : 0;
};

/**
 * A compact number stepper (- value +) for dense toolbars. The field is
 * sized for three digits and a decimal ("10.5", "100") and never
 * truncates. Typing keeps a draft and applies it once it parses inside the
 * range, so "14" can be typed through "1"; blur restores the applied
 * value. ArrowUp and ArrowDown step.
 */
export function Stepper({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  label,
  decrementLabel = 'Decrease',
  incrementLabel = 'Increase',
  decrementIcon = IconMinus,
  incrementIcon = IconPlus,
  unit,
  size = 'md',
  tooltips = true,
  disabled,
  id,
  className,
}: StepperProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const places = decimals(step);
  const round = (n: number) => Number(n.toFixed(places));
  const clamp = (n: number) => Math.min(max, Math.max(min, round(n)));
  const shown = draft ?? String(round(value));
  const lg = size === 'lg';

  const by = (dir: 1 | -1) => {
    setDraft(null);
    onValueChange(clamp(value + dir * step));
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      by(e.key === 'ArrowUp' ? 1 : -1);
    } else if (e.key === 'Enter') {
      setDraft(null);
    }
  };

  const button = (dir: 1 | -1) => {
    const name = dir < 0 ? decrementLabel : incrementLabel;
    const b = (
      <IconButton
        label={name}
        icon={dir < 0 ? decrementIcon : incrementIcon}
        variant="ghost"
        size={lg ? 'lg' : 'sm'}
        disabled={disabled || (dir < 0 ? value <= min : value >= max)}
        onClick={() => by(dir)}
        className="shrink-0"
      />
    );
    return tooltips ? <Tooltip content={name}>{b}</Tooltip> : b;
  };

  return (
    <div
      data-stepper=""
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border border-line-strong bg-surface-2',
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus',
        lg ? 'h-11' : 'h-8',
        disabled && 'opacity-50',
        className,
      )}
    >
      {button(-1)}
      <input
        type="number"
        id={id}
        aria-label={label}
        value={shown}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          const n = Number(text);
          if (text.trim() !== '' && Number.isFinite(n) && n >= min && n <= max)
            onValueChange(round(n));
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={onKeyDown}
        className={cn(
          'w-[5ch] min-w-[5ch] shrink-0 bg-transparent text-center font-mono text-sm text-fg tabular-nums focus:outline-none',
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        )}
      />
      {unit ? (
        <span aria-hidden className="-ml-0.5 pr-0.5 text-xs text-fg-subtle">
          {unit}
        </span>
      ) : null}
      {button(1)}
    </div>
  );
}
Stepper.displayName = 'Stepper';
