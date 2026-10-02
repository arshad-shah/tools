import React, { useId, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { IconPalette } from './icons';
import { ColorInput } from './color-input';
import { Popover } from './popover';
import { Swatch } from './swatch';

export interface ColorSwatchOption {
  /** '#rrggbb'. */
  value: string;
  label: string;
}

export interface ColorSwatchPickerProps {
  label: string;
  /** '#rrggbb'. */
  value: string;
  onChange(hex: string): void;
  options: ColorSwatchOption[];
  /** Adds a "Custom colour" choice that opens a hex field. */
  allowCustom?: boolean;
  /** Shows `label` above the swatches (it names the group either way). */
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Preset colours as a radiogroup of swatches (roving tabindex; arrows move
 * and select, Home and End jump), plus an optional custom colour.
 */
export function ColorSwatchPicker({
  label,
  value,
  onChange,
  options,
  allowCustom = false,
  showLabel = false,
  disabled = false,
  className,
}: ColorSwatchPickerProps) {
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const customRef = useRef<HTMLButtonElement | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const preset = options.findIndex((o) => same(o.value, value));
  const count = options.length + (allowCustom ? 1 : 0);
  const customIndex = allowCustom ? options.length : -1;
  const current = preset >= 0 ? preset : allowCustom ? customIndex : 0;

  const choose = (i: number, open: boolean) => {
    if (disabled) return;
    refs.current[i]?.focus();
    if (i === customIndex) {
      if (open) setCustomOpen(true);
      return;
    }
    onChange(options[i].value);
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % count;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (i - 1 + count) % count;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    if (next === null) return;
    e.preventDefault();
    choose(next, false);
  };

  const radio = (i: number, name: string, body: React.ReactNode) => (
    <button
      key={name}
      ref={(el) => {
        refs.current[i] = el;
        if (i === customIndex) customRef.current = el;
      }}
      type="button"
      role="radio"
      aria-checked={i === current}
      aria-label={name}
      tabIndex={i === current ? 0 : -1}
      disabled={disabled}
      onClick={() => choose(i, true)}
      onKeyDown={(e) => onKeyDown(e, i)}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md outline-none transition-colors duration-fast',
        'hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-focus',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent',
        i === current && 'bg-accent-soft',
      )}
    >
      {body}
    </button>
  );

  const group = (
    <div
      role="radiogroup"
      aria-label={showLabel ? undefined : label}
      aria-labelledby={showLabel ? labelId : undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        'inline-flex flex-wrap items-center gap-1',
        !showLabel && className,
      )}
    >
      {options.map((o, i) =>
        radio(
          i,
          o.label,
          <Swatch
            color={o.value}
            label={o.label}
            size="sm"
            selected={i === current}
          />,
        ),
      )}
      {allowCustom ? (
        <>
          {radio(
            customIndex,
            preset < 0 ? `Custom colour ${value}` : 'Custom colour',
            preset < 0 ? (
              <Swatch color={value} label={value} size="sm" selected />
            ) : (
              <IconPalette size="sm" />
            ),
          )}
          <Popover
            open={customOpen}
            onOpenChange={setCustomOpen}
            anchor={customRef}
            label={`${label}: custom colour`}
            side="bottom"
          >
            <div className="p-3">
              <ColorInput
                label={`${label} hex`}
                value={value}
                onChange={onChange}
              />
            </div>
          </Popover>
        </>
      ) : null}
    </div>
  );
  if (!showLabel) return group;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span id={labelId} className="text-sm font-medium text-fg">
        {label}
      </span>
      {group}
    </div>
  );
}
ColorSwatchPicker.displayName = 'ColorSwatchPicker';
