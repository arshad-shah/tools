import { cn } from '@/shared/lib/cn';
import { ToolError } from '@/shared/lib/errors';

export type StatusTone = 'accent' | 'danger' | 'warning' | 'info' | 'muted';

const TONE: Record<StatusTone, string> = {
  accent: 'bg-accent-indicator',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
  muted: 'bg-fg-subtle',
};

interface StatusDotBase {
  tone: StatusTone;
  /** Pulses only when motion is allowed. */
  pulse?: boolean;
  className?: string;
}

/** A label is required unless the dot is explicitly decorative (spec §4.6). */
export type StatusDotProps = StatusDotBase &
  (
    | { label: string; decorative?: false }
    | { decorative: true; label?: undefined }
  );

/** 8px status indicator: replaces dot and bullet characters. */
export function StatusDot(props: StatusDotProps) {
  const { tone, pulse, className } = props;
  if (!props.decorative && !props.label?.trim())
    throw new ToolError(
      'INVALID_INPUT',
      'StatusDot needs a label unless it is decorative.',
    );
  const a11y = props.decorative
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'img', 'aria-label': props.label } as const);
  return (
    <span
      {...a11y}
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        TONE[tone],
        pulse && 'motion-safe:animate-pulse',
        className,
      )}
    />
  );
}
StatusDot.displayName = 'StatusDot';
