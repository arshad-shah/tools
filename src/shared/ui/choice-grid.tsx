import React, { useId, useRef } from 'react';
import { cn } from '@/shared/lib/cn';

export interface ChoiceOption<V extends string> {
  value: V;
  /** Shown under the card; also the card's accessible name. */
  label: string;
  /** The card's picture (e.g. a FontPreview). */
  render(): React.ReactNode;
}

export interface ChoiceGridProps<V extends string> {
  label: string;
  value: V | null;
  onChange(v: V): void;
  options: ChoiceOption<V>[];
  /** Cards per row (default 2); arrow keys move across rows and columns. */
  columns?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * An exclusive choice among picture cards (typed signature gallery): a
 * radiogroup with a roving tabindex. Left/Right move through the cards
 * (wrapping), Up/Down move a row (staying put at the edges), Home/End
 * jump; moving selects, as radio buttons do.
 */
export function ChoiceGrid<V extends string>({
  label,
  value,
  onChange,
  options,
  columns = 2,
  disabled,
  className,
}: ChoiceGridProps<V>) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const cols = Math.max(1, Math.floor(columns));
  const current = options.findIndex((o) => o.value === value);
  const tabStop = current >= 0 ? current : 0;

  const select = (i: number) => {
    onChange(options[i].value);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (disabled || e.altKey || e.ctrlKey || e.metaKey) return;
    const n = options.length;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (i + 1) % n;
    else if (e.key === 'ArrowLeft') next = (i - 1 + n) % n;
    else if (e.key === 'ArrowDown') next = i + cols < n ? i + cols : i;
    else if (e.key === 'ArrowUp') next = i - cols >= 0 ? i - cols : i;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next === null) return;
    e.preventDefault();
    select(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={cn('grid gap-2', className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {options.map((o, i) => {
        const checked = i === current;
        const labelId = `${id}-${i}`;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-labelledby={labelId}
            disabled={disabled}
            tabIndex={i === tabStop ? 0 : -1}
            onClick={() => select(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'flex min-w-0 flex-col items-stretch gap-1 rounded-md border p-2 text-left transition-colors duration-fast ease-out-soft',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
              'disabled:pointer-events-none disabled:opacity-50',
              checked
                ? 'border-accent-indicator bg-accent-soft'
                : 'border-line bg-surface hover:border-line-strong',
            )}
          >
            <span className="min-h-12 overflow-hidden rounded-sm bg-white">
              {o.render()}
            </span>
            <span
              id={labelId}
              className={cn(
                'truncate text-xs',
                checked ? 'font-medium text-fg' : 'text-fg-muted',
              )}
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
ChoiceGrid.displayName = 'ChoiceGrid';
