import { useMemo } from 'react';
import { cn } from '@/shared/lib/cn';
import {
  DEFAULT_STEPS,
  formatColor,
  scale,
  type Color,
  type ColorFormat,
} from '@/shared/lib/colour';
import { tryParse } from './color-picker-model';
import { Swatch } from './swatch';

export interface ColorRampProps {
  /** Any CSS colour; the ramp keeps its OKLCH hue and chroma. */
  base: string;
  /** Accessible name of the row. */
  label: string;
  /** The selected colour (any CSS colour, compared as hex). */
  value?: string;
  /** Makes the steps buttons. Without it the ramp is a read-only row. */
  onSelect?(css: string, color: Color, step: number): void;
  steps?: readonly number[];
  hueShift?: number;
  chromaCurve?: number;
  /** Text format passed to `onSelect`. */
  format?: ColorFormat;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * OKLCH tonal ramp (Tailwind-style 50 to 950) around a base colour, from
 * the colour engine's `scale`. Steps are selectable swatches when
 * `onSelect` is given.
 */
export function ColorRamp({
  base,
  label,
  value,
  onSelect,
  steps = DEFAULT_STEPS,
  hueShift,
  chromaCurve,
  format = 'hex',
  size = 'md',
  className,
}: ColorRampProps) {
  const parsed = useMemo(() => tryParse(base), [base]);
  const ramp = useMemo(
    () =>
      parsed.color
        ? Object.entries(scale(parsed.color, { steps, hueShift, chromaCurve }))
            .map(([step, c]) => ({ step: Number(step), color: c }))
            .sort((a, b) => a.step - b.step)
        : [],
    [parsed, steps, hueShift, chromaCurve],
  );
  const selectedHex = useMemo(() => {
    if (!value) return null;
    const p = tryParse(value);
    return p.color ? formatColor(p.color, 'hex') : null;
  }, [value]);

  if (parsed.error)
    return (
      <p role="alert" className={cn('text-sm text-danger', className)}>
        {parsed.error}
      </p>
    );

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex flex-wrap gap-1', className)}
    >
      {ramp.map(({ step, color }) => {
        const hex = formatColor(color, 'hex');
        const name = `${step} ${hex}`;
        const selected = hex === selectedHex;
        if (!onSelect)
          return (
            <Swatch
              key={step}
              color={hex}
              label={name}
              size={size}
              selected={selected}
            />
          );
        return (
          <button
            key={step}
            type="button"
            aria-label={name}
            aria-pressed={selected}
            title={name}
            onClick={() => onSelect(formatColor(color, format), color, step)}
            className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <span aria-hidden className="flex">
              <Swatch
                color={hex}
                label={name}
                size={size}
                selected={selected}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
ColorRamp.displayName = 'ColorRamp';
