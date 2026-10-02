import React, { useRef } from 'react';
import { cn } from '@/shared/lib/cn';
import type { IconComponent } from './icons';
import { useScrollRow } from './use-scroll-row';

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  icon?: IconComponent;
  disabled?: boolean;
}

export interface SegmentedControlProps<V extends string> {
  label: string;
  value: V;
  onChange(v: V): void;
  /** Two to five exclusive options. */
  options: SegmentedOption<V>[];
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Exclusive choice among 2 to 5 options (theme, presets): a radiogroup with
 * a roving tabindex; arrows move and select, Home/End jump, disabled
 * options are skipped.
 */
export function SegmentedControl<V extends string>({
  label,
  value,
  onChange,
  options,
  size = 'md',
  className,
}: SegmentedControlProps<V>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const scroller = useScrollRow<HTMLDivElement>('x');
  const enabled = options
    .map((o, i) => (o.disabled ? -1 : i))
    .filter((i) => i >= 0);
  const current = options.findIndex((o) => o.value === value);

  const select = (i: number) => {
    onChange(options[i].value);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (enabled.length === 0) return;
    // A value outside the options: forward starts at the first option,
    // backward at the last.
    const found = enabled.indexOf(current);
    const pos =
      found >= 0
        ? found
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? 0
          : enabled.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
      next = enabled[(pos + 1) % enabled.length];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = enabled[(pos - 1 + enabled.length) % enabled.length];
    else if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled[enabled.length - 1];
    if (next === null) return;
    e.preventDefault();
    select(next);
  };

  const tabStop =
    current >= 0 && !options[current]?.disabled ? current : enabled[0];

  return (
    <div
      ref={scroller}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        // Never wider than its container: on a narrow screen the options
        // scroll sideways (edge fade) instead of pushing the page wide.
        'inline-flex max-w-full gap-1 overflow-x-auto overscroll-x-contain rounded-lg bg-surface-2 p-1 scrollbar-none scroll-fade-x',
        className,
      )}
    >
      {options.map((o, i) => {
        const checked = i === current;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={o.disabled}
            tabIndex={i === tabStop ? 0 : -1}
            onClick={() => select(i)}
            className={cn(
              'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors duration-fast ease-out-soft',
              'disabled:pointer-events-none disabled:opacity-50',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
              'pointer-coarse:h-11',
              checked
                ? 'bg-surface text-fg shadow-e1'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            {Icon ? <Icon size={size === 'sm' ? 'xs' : 'sm'} /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
SegmentedControl.displayName = 'SegmentedControl';
