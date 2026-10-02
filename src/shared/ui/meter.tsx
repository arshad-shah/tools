import React, { useId } from 'react';
import { cn } from '@/shared/lib/cn';

export type MeterTone = 'danger' | 'warning' | 'ok';

export interface MeterProps {
  /** 0 to 1 (clamped). */
  value: number;
  /** Draw this many discrete segments instead of a continuous bar. */
  segments?: number;
  /** 'auto' (default) picks from the value: below 0.4 danger, below 0.7 warning. */
  tone?: MeterTone | 'auto';
  /** Accessible name, also shown above the bar. */
  label: string;
  /** Words for the value, e.g. "Strong" or "62 bits". */
  valueText: string;
  /** Keep the label and value text for assistive tech only. */
  hideLabel?: boolean;
  className?: string;
}

/** The auto tone for a 0 to 1 value. */
const meterTone = (value: number): MeterTone =>
  value < 0.4 ? 'danger' : value < 0.7 ? 'warning' : 'ok';

const FILL: Record<MeterTone, string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  ok: 'bg-accent-indicator',
};

/** A scalar gauge (`role=meter`), e.g. password strength or entropy. */
export const Meter: React.FC<MeterProps> = ({
  value,
  segments,
  tone = 'auto',
  label,
  valueText,
  hideLabel,
  className,
}) => {
  const id = useId();
  const v = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const t = tone === 'auto' ? meterTone(v) : tone;
  const count = segments && segments > 0 ? Math.floor(segments) : 0;
  const on = Math.round(v * count);
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        className={cn(
          'flex items-baseline justify-between gap-3 text-sm',
          hideLabel && 'sr-only',
        )}
      >
        <span id={`${id}-label`} className="font-medium text-fg">
          {label}
        </span>
        <span className="text-fg-muted" aria-hidden>
          {valueText}
        </span>
      </div>
      <div
        role="meter"
        aria-labelledby={`${id}-label`}
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuetext={valueText}
        data-tone={t}
        className={cn('flex h-2 w-full', count ? 'gap-1' : '')}
      >
        {count ? (
          Array.from({ length: count }, (_, i) => (
            <span
              key={i}
              data-segment={i < on ? 'on' : 'off'}
              className={cn(
                'h-full flex-1 rounded-full transition-colors duration-fast',
                i < on ? FILL[t] : 'bg-surface-3',
              )}
            />
          ))
        ) : (
          <span className="h-full w-full overflow-hidden rounded-full bg-surface-3">
            <span
              className={cn(
                'block h-full rounded-full motion-safe:transition-[width]',
                FILL[t],
              )}
              style={{ width: `${v * 100}%` }}
            />
          </span>
        )}
      </div>
    </div>
  );
};
Meter.displayName = 'Meter';
